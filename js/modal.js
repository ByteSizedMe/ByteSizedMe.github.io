/*
 * modal.js: card activation and the dossier (case file) view.
 *
 * Click a card:
 *   1. highlight: connected strings brighten and pulse, unrelated cards dim
 *   2. camera flies to the card (its zoomFocus)
 *   3. the card lifts, flips edge-on, and the dark dossier flips in from it
 * Close reverses it all and the camera returns to the view it had before.
 * Prev / next file step through the tour (data.tour in js/content.js), one file at a time.
 * Focusing a card with the keyboard pans the camera to it.
 *
 * Touch: the first tap on a card flies to it and shows an OPEN FILE button; a second
 * tap on the same card, or that button, opens the dossier. List view (js/list.js)
 * opens the same dossier with no camera or card flip (Dossier.open(id, { list: true })).
 *
 * Camera moves come from js/camera.js. While the dossier is open, <body> has
 * .dossier-open, which locks camera input.
 */
(function () {
  'use strict';

  var LIFT = 1.05;        // card scale while lifted
  var PERSPECTIVE = 1400; // px, for the card flip
  var STATE = { CLOSED: 'closed', FLYING: 'flying', REVEALING: 'revealing', OPEN: 'open', NAVIGATING: 'navigating', CLOSING: 'closing' };

  function init() {
    var data = window.CASE;
    var world = document.getElementById('world');
    if (!data || !world || !window.Camera) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var state = STATE.CLOSED;
    var current = null;        // id of the card whose dossier is showing
    var returnView = null;     // camera view before the first open
    var wantClose = false;     // close was asked for mid-transition
    var suppressFocusPan = false;
    var cardAnims = [];        // flip animations held on the current card
    var inertNodes = [];
    var mode = 'board';        // 'board' (camera + card flip) or 'list' (plain fade)
    var selectedId = null;     // touch: the card that has been tapped once
    var preSelectView = null;  // the camera view before that first tap: where closing returns to
    var pressView = null;      // the view at the last pointerdown, before camera.js reacts to the press
    var selectionSettled = false;  // the fly-in finished: any camera move after that is the user's
    var lastPointer = 'mouse';
    var viewport = document.getElementById('viewport');

    // ---- small helpers --------------------------------------------------

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    function byId(id) {
      for (var i = 0; i < data.cards.length; i++) if (data.cards[i].id === id) return data.cards[i];
      return null;
    }

    // The tour: every card once, in the order previous / next walks through them.
    var tour = (data.tour || []).filter(function (id) { return byId(id); });
    data.cards.forEach(function (c) { if (tour.indexOf(c.id) < 0) tour.push(c.id); });

    function cardEl(id) { return world.querySelector('.card[data-id="' + id + '"]'); }
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function noop() {}

    function wait(ms) {
      if (reduceMotion.matches || !ms) return Promise.resolve();
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    // Web Animations wrapper: null (no animation) under reduced motion.
    function play(node, keyframes, options) {
      if (reduceMotion.matches || !node.animate) return null;
      var a = node.animate(keyframes, options);
      a.finished.catch(noop);
      return a;
    }
    function finished(a) { return a ? a.finished.catch(noop) : Promise.resolve(); }
    function cancel(a) { if (a) a.cancel(); }

    // Append text, marking everything from "TODO" onward so placeholders stand out.
    function appendRich(parent, text) {
      var i = text.indexOf('TODO');
      if (i < 0) { parent.appendChild(document.createTextNode(text)); return; }
      if (i > 0) parent.appendChild(document.createTextNode(text.slice(0, i)));
      parent.appendChild(el('span', 'is-todo', text.slice(i)));
    }

    // ---- highlight: strings + dimming ----------------------------------

    function connectedIds(id) {
      var out = [];
      data.connections.forEach(function (c) {
        if (c.from === id) out.push(c.to);
        else if (c.to === id) out.push(c.from);
      });
      return out;
    }

    function clearHighlight() {
      world.classList.remove('has-focus');
      Array.prototype.forEach.call(world.querySelectorAll('.is-focused, .is-linked, .is-hot'), function (n) {
        n.classList.remove('is-focused', 'is-linked', 'is-hot');
      });
    }

    function setHighlight(id) {
      clearHighlight();
      world.classList.add('has-focus');
      var card = cardEl(id);
      if (card) card.classList.add('is-focused');
      connectedIds(id).forEach(function (other) {
        var linked = cardEl(other);
        if (linked) linked.classList.add('is-linked');
      });
      Array.prototype.forEach.call(world.querySelectorAll('.string'), function (g) {
        if (g.getAttribute('data-from') === id || g.getAttribute('data-to') === id) g.classList.add('is-hot');
      });
    }

    // How far a flight between two connected cards should bow, read off the real
    // string path ("M x y Q cx cy x y") so it follows the string's sag.
    function stringArc(a, b) {
      var groups = world.querySelectorAll('.string');
      for (var i = 0; i < groups.length; i++) {
        var f = groups[i].getAttribute('data-from');
        var t = groups[i].getAttribute('data-to');
        if ((f === a && t === b) || (f === b && t === a)) {
          var n = groups[i].querySelector('.string__core').getAttribute('d').match(/-?[\d.]+/g).map(Number);
          return (n[3] - (n[1] + n[5]) / 2) / 2;
        }
      }
      return 0;
    }

    // ---- dossier DOM ----------------------------------------------------

    var dossier = el('div', 'dossier');
    dossier.id = 'dossier';
    dossier.hidden = true;

    var backdrop = el('div', 'dossier__backdrop');
    var panel = el('section', 'dossier__panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'dossier-title');
    panel.setAttribute('aria-describedby', 'dossier-summary');
    panel.tabIndex = -1;

    var tab = el('div', 'dossier__tab');
    tab.setAttribute('aria-hidden', 'true');
    var closeBtn = el('button', 'dossier__close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close case file');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5L5 19"/></svg>';

    var head = el('div', 'dossier__head');
    var labelEl = el('p', 'dossier__label');
    var titleEl = el('h2', 'dossier__title');
    titleEl.id = 'dossier-title';
    var subtitleEl = el('p', 'dossier__subtitle');
    var summaryEl = el('p', 'dossier__summary');
    summaryEl.id = 'dossier-summary';
    var tagsEl = el('div', 'dossier__tags');
    head.appendChild(labelEl);
    head.appendChild(titleEl);
    head.appendChild(subtitleEl);
    head.appendChild(summaryEl);
    head.appendChild(tagsEl);

    var bodyEl = el('div', 'dossier__body');
    bodyEl.tabIndex = 0;
    bodyEl.setAttribute('role', 'region');
    bodyEl.setAttribute('aria-label', 'File contents');

    var foot = el('div', 'dossier__foot');
    var linksEl = el('div', 'dossier__links');
    var navEl = el('nav', 'dossier__nav');
    navEl.setAttribute('aria-label', 'Connected files');
    foot.appendChild(linksEl);
    foot.appendChild(navEl);

    panel.appendChild(tab);
    panel.appendChild(closeBtn);
    panel.appendChild(head);
    panel.appendChild(bodyEl);
    panel.appendChild(foot);
    dossier.appendChild(backdrop);
    dossier.appendChild(panel);
    document.body.appendChild(dossier);

    // ---- rendering the case file ---------------------------------------

    function sectionEl(s) {
      var sec = el('section', 'dossier__section');
      sec.appendChild(el('h3', 'dossier__h', s.heading));
      if (s.text) {
        var p = el('p', 'dossier__text');
        appendRich(p, s.text);
        sec.appendChild(p);
      }
      if (s.list) {
        var ul = el('ul', 'dossier__list');
        s.list.forEach(function (item) {
          var li = el('li');
          appendRich(li, item);
          ul.appendChild(li);
        });
        sec.appendChild(ul);
      }
      if (s.rows) {
        var dl = el('dl', 'dossier__rows');
        s.rows.forEach(function (r) {
          dl.appendChild(el('dt', null, r[0]));
          var dd = el('dd');
          appendRich(dd, r[1]);
          dl.appendChild(dd);
        });
        sec.appendChild(dl);
      }
      return sec;
    }

    function linkEl(l) {
      var wrap = el('div', 'dossier__link-wrap');
      var todo = /^TODO/.test(l.url);
      var node;
      if (todo) {
        node = el('span', 'dossier__link is-todo', l.label + ': TODO');
      } else {
        node = el('a', 'dossier__link', l.label);
        node.href = l.url;
        if (/^(https?:)?\/\//.test(l.url)) {
          node.target = '_blank';
          node.rel = 'noopener noreferrer';
          node.appendChild(el('span', 'dossier__ext', ' ↗'));
          node.setAttribute('aria-label', l.label + ' (opens in a new tab)');
        } else if (/^assets\//.test(l.url)) {
          node.setAttribute('download', '');
        }
      }
      wrap.appendChild(node);
      if (l.note) wrap.appendChild(el('span', 'dossier__note', l.note));
      return wrap;
    }

    // Linear: previous and next are simply the neighbours in the tour. The first file has
    // no previous and the last has no next, so it never loops. Both are named on the buttons.
    function navTargets(c) {
      var i = tour.indexOf(c.id);
      return { prev: i > 0 ? tour[i - 1] : null, next: i < tour.length - 1 ? tour[i + 1] : null };
    }

    function navButton(dir, id) {
      var target = byId(id);
      var b = el('button', 'dossier__navbtn dossier__navbtn--' + dir);
      b.type = 'button';
      b.dataset.go = id;
      b.dataset.dir = dir;
      var cap = dir === 'prev' ? 'PREVIOUS FILE' : 'NEXT FILE';
      var capEl = el('span', 'dossier__navcap');
      // the arrow glyphs are decoration: keep them out of the accessible name
      if (dir === 'prev') capEl.appendChild(el('span', null, '< ')).setAttribute('aria-hidden', 'true');
      capEl.appendChild(document.createTextNode(cap));
      if (dir === 'next') capEl.appendChild(el('span', null, ' >')).setAttribute('aria-hidden', 'true');
      b.appendChild(capEl);
      b.appendChild(el('span', 'dossier__navtitle', target.shortTitle || target.title));
      return b;
    }

    function render(c) {
      var n = tour.length;
      var index = tour.indexOf(c.id) + 1;
      tab.textContent = 'FILE ' + pad(index) + ' / ' + pad(n);
      labelEl.textContent = data.site.caseNo + ' · ' + c.label;
      titleEl.textContent = c.title;
      subtitleEl.textContent = c.subtitle || '';
      subtitleEl.hidden = !c.subtitle;
      summaryEl.textContent = '';
      appendRich(summaryEl, c.summary);

      tagsEl.textContent = '';
      (c.tags || []).forEach(function (t) {
        tagsEl.appendChild(el('span', 'dossier__tag' + (/^TODO/.test(t) ? ' is-todo' : ''), t));
      });
      if (c.status) tagsEl.appendChild(el('span', 'dossier__status', c.status));
      tagsEl.hidden = !tagsEl.firstChild;

      bodyEl.textContent = '';
      ((c.detail && c.detail.sections) || []).forEach(function (s) { bodyEl.appendChild(sectionEl(s)); });
      bodyEl.scrollTop = 0;

      linksEl.textContent = '';
      (c.links || []).forEach(function (l) { linksEl.appendChild(linkEl(l)); });
      linksEl.hidden = !linksEl.firstChild;

      navEl.textContent = '';
      var t = navTargets(c);
      if (t.prev) navEl.appendChild(navButton('prev', t.prev));
      if (t.next) navEl.appendChild(navButton('next', t.next));
      navEl.hidden = !navEl.firstChild;
    }

    // ---- geometry + animations -----------------------------------------

    // Where the card sits on screen relative to the panel's resting place, so the
    // panel can unfold from (and fold back into) the card.
    function geometry(card, c) {
      var r = card.getBoundingClientRect();
      var pr = panel.getBoundingClientRect();
      var k = Camera.getState().k;
      var s = Math.max(0.25, Math.min(1.1, (c.h * k * LIFT) / pr.height));
      return {
        dx: r.left + r.width / 2 - (pr.left + pr.width / 2),
        dy: r.top + r.height / 2 - (pr.top + pr.height / 2),
        s: s,
        rot: c.rot
      };
    }

    function panelFrames(g, out) {
      var edge = 'perspective(1600px) translate(' + g.dx + 'px,' + g.dy + 'px) rotate(' + g.rot + 'deg) scale(' + g.s + ') rotateY(-90deg)';
      var rest = 'perspective(1600px) translate(0px,0px) rotate(0deg) scale(1) rotateY(0deg)';
      return out ? [{ transform: rest }, { transform: edge }] : [{ transform: edge }, { transform: rest }];
    }

    function flipCard(card, c, from, to, ms, easing) {
      var base = 'perspective(' + PERSPECTIVE + 'px) rotate(' + c.rot + 'deg) scale(' + LIFT + ') rotateY(';
      var a = play(card, [{ transform: base + from + 'deg)' }, { transform: base + to + 'deg)' }],
        { duration: ms, easing: easing, fill: 'forwards' });
      if (a) cardAnims.push(a);
      return a;
    }

    function releaseCardAnims() {
      cardAnims.forEach(cancel);
      cardAnims = [];
    }

    function setInert(on) {
      if (on) {
        inertNodes = ['viewport', 'hud', 'minimap', 'list-view', 'view-switch', 'open-btn']
          .map(function (id) { return document.getElementById(id); })
          .concat(Array.prototype.slice.call(document.querySelectorAll('h1.sr-only')))
          .filter(Boolean);
        inertNodes.forEach(function (n) { n.inert = true; });
      } else {
        inertNodes.forEach(function (n) { n.inert = false; });
        inertNodes = [];
      }
    }

    // ---- transitions ----------------------------------------------------

    // Lift the card, flip it edge-on, flip the dossier in from it.
    function reveal(id, fast) {
      var card = cardEl(id);
      var c = byId(id);
      state = STATE.REVEALING;
      card.classList.add('is-lifted');

      return wait(fast ? 160 : 320).then(function () {
        render(c);
        dossier.hidden = false;
        panel.style.opacity = '0';
        document.body.classList.add('dossier-open');
        setInert(true);
        play(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
        return finished(flipCard(card, c, 0, 90, fast ? 170 : 250, 'ease-in'));
      }).then(function () {
        var g = geometry(card, c);
        panel.style.opacity = '';
        return finished(play(panel, panelFrames(g, false), {
          duration: fast ? 360 : 480, easing: 'cubic-bezier(.2,.7,.2,1)'
        }));
      }).then(function () {
        state = STATE.OPEN;
        panel.focus({ preventScroll: true });
        if (wantClose) { wantClose = false; close(); }
      });
    }

    // Panel folds back into the card, the card flips back down.
    function foldBack(card, c, fast) {
      var g = geometry(card, c);
      var out = play(panel, panelFrames(g, true), { duration: fast ? 240 : 340, easing: 'ease-in', fill: 'forwards' });
      return finished(out).then(function () {
        panel.style.opacity = '0';
        cancel(out);
        return finished(flipCard(card, c, 90, 0, fast ? 170 : 250, 'ease-out'));
      }).then(function () {
        releaseCardAnims();
      });
    }

    function open(id) {
      if (state !== STATE.CLOSED || !cardEl(id) || document.body.classList.contains('intro-running')) return;
      var wasSelected = selectedId !== null;
      selectedId = null;
      selectionSettled = false;
      openBtn.hidden = true;
      if (!wasSelected) preSelectView = null;
      mode = 'board';
      state = STATE.FLYING;
      current = id;
      wantClose = false;
      returnView = preSelectView || Camera.getView();   // after a touch select, the camera is already on the card
      preSelectView = null;
      setHighlight(id);
      Camera.flyTo(id).then(function (arrived) {
        if (state !== STATE.FLYING) return;
        if (!arrived) {          // the user grabbed the camera: drop the highlight and stay put
          clearHighlight();
          state = STATE.CLOSED;
          current = null;
          return;
        }
        return reveal(id, false);
      });
    }

    // ---- touch: tap once to fly there, tap again (or OPEN FILE) to open -----

    var openBtn = el('button', 'open-btn');
    openBtn.id = 'open-btn';
    openBtn.type = 'button';
    openBtn.hidden = true;
    (document.getElementById('hud') || document.body).appendChild(openBtn);   // inside the HUD landmark

    function clearSelection() {
      if (!selectedId) return;
      selectedId = null;
      preSelectView = null;
      selectionSettled = false;
      openBtn.hidden = true;
      if (state === STATE.CLOSED) clearHighlight();
    }

    function select(id) {
      if (state !== STATE.CLOSED || !cardEl(id) || document.body.classList.contains('intro-running')) return;
      var before = selectedId ? preSelectView : (pressView || Camera.getView());   // keep the first view when re-selecting
      clearSelection();
      selectedId = id;
      selectionSettled = false;
      preSelectView = before;
      var c = byId(id);
      setHighlight(id);
      openBtn.textContent = '';
      openBtn.appendChild(el('span', 'open-btn__cap', 'OPEN FILE'));
      openBtn.appendChild(el('span', 'open-btn__title', c.shortTitle || c.title));
      openBtn.hidden = false;
      Camera.flyTo(id).then(function (arrived) {
        if (selectedId !== id) return;            // another card was chosen meanwhile
        if (!arrived) clearSelection();           // the user grabbed the camera
        else selectionSettled = true;
      });
    }

    openBtn.addEventListener('click', function () { if (selectedId) open(selectedId); });

    // ---- list view: the same dossier, no camera and no card flip -----------

    function openList(id) {
      var c = byId(id);
      if (state !== STATE.CLOSED || !c) return;
      mode = 'list';
      current = id;
      wantClose = false;
      state = STATE.REVEALING;
      render(c);
      dossier.hidden = false;
      panel.style.opacity = '';
      document.body.classList.add('dossier-open');
      setInert(true);
      play(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
      finished(play(panel, [{ opacity: 0, transform: 'translateY(18px) scale(0.98)' }, { opacity: 1, transform: 'none' }],
        { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' })).then(function () {
        state = STATE.OPEN;
        panel.focus({ preventScroll: true });
        if (wantClose) { wantClose = false; close(); }
      });
    }

    function closeList() {
      state = STATE.CLOSING;
      wantClose = false;
      var fade = play(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      var out = play(panel, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px) scale(0.98)' }],
        { duration: 220, easing: 'ease-in', fill: 'forwards' });
      Promise.all([finished(out), finished(fade)]).then(function () {
        dossier.hidden = true;
        cancel(out);
        cancel(fade);
        setInert(false);
        document.body.classList.remove('dossier-open');
        var item = document.querySelector('#list-view [data-id="' + current + '"]');
        if (item) item.focus();
        state = STATE.CLOSED;
        current = null;
        mode = 'board';
      });
    }

    function navigateList(toId) {
      state = STATE.NAVIGATING;
      wantClose = false;
      var out = play(panel, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
      finished(out).then(function () {
        cancel(out);
        current = toId;
        render(byId(toId));
        return finished(play(panel, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
          { duration: 200, easing: 'ease-out' }));
      }).then(function () {
        state = STATE.OPEN;
        panel.focus({ preventScroll: true });
        if (wantClose) { wantClose = false; close(); }
      });
    }

    // Esc while still flying in: stop and go back where we were.
    function cancelFlight() {
      Camera.stop();
      clearHighlight();
      var view = returnView;
      state = STATE.CLOSING;
      Camera.flyToView(view).then(function () {
        state = STATE.CLOSED;
        current = null;
      });
    }

    function focusCard(card) {
      suppressFocusPan = true;
      card.focus({ preventScroll: true });
      suppressFocusPan = false;
    }

    function close() {
      if (mode === 'list') {
        if (state === STATE.OPEN) closeList();
        else if (state === STATE.REVEALING || state === STATE.NAVIGATING) wantClose = true;
        return;
      }
      if (state === STATE.FLYING) { cancelFlight(); return; }
      if (state !== STATE.OPEN) {
        if (state === STATE.REVEALING || state === STATE.NAVIGATING) wantClose = true;
        return;
      }
      state = STATE.CLOSING;
      wantClose = false;
      var card = cardEl(current);
      var c = byId(current);
      var fade = play(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 340, fill: 'forwards' });

      foldBack(card, c, false).then(function () {
        dossier.hidden = true;
        panel.style.opacity = '';
        cancel(fade);
        card.classList.remove('is-lifted');
        clearHighlight();
        setInert(false);
        document.body.classList.remove('dossier-open');
        focusCard(card);
        return Camera.flyToView(returnView);
      }).then(function () {
        state = STATE.CLOSED;
        current = null;
      });
    }

    // Fly the camera to the next / previous file in the tour, then open it. (When the two
    // cards happen to be joined by a string the flight follows its sag.)
    function navigate(toId) {
      if (state !== STATE.OPEN || !byId(toId)) return;
      if (mode === 'list') { navigateList(toId); return; }
      state = STATE.NAVIGATING;
      wantClose = false;
      var fromId = current;
      var card = cardEl(fromId);
      var c = byId(fromId);

      var fade = play(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' });
      foldBack(card, c, true).then(function () {
        cancel(fade);
        backdrop.style.opacity = '0';
        card.classList.remove('is-lifted');
        current = toId;
        setHighlight(toId);
        return Camera.flyTo(toId, { arc: stringArc(fromId, toId) });
      }).then(function () {
        backdrop.style.opacity = '';
        return reveal(toId, true);
      });
    }

    // ---- events ---------------------------------------------------------

    world.addEventListener('pointerdown', function (e) {
      lastPointer = e.pointerType;
      pressView = Camera.getView();      // (capture phase: runs before camera.js clears its auto-view flag)
    }, true);

    // after the fly-in, any camera movement (pan, pinch, zoom) is the user moving on
    Camera.onChange(function () { if (selectedId && selectionSettled) clearSelection(); });

    // Click (or Enter / Space) on a card. camera.js swallows the click after a pan.
    // A touch tap needs two steps: tap to fly there, tap again (or OPEN FILE) to open.
    world.addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (!card) return;
      var id = card.dataset.id;
      var tap = lastPointer === 'touch' && e.detail > 0;   // detail 0 = keyboard: open straight away
      if (tap && selectedId !== id) select(id); else open(id);
    });

    // a tap on the bare wall drops the selection
    viewport.addEventListener('click', function (e) {
      if (selectedId && !e.target.closest('.card')) clearSelection();
    });

    // Focusing a card with the keyboard pans the camera to it.
    world.addEventListener('focusin', function (e) {
      if (state !== STATE.CLOSED || suppressFocusPan || document.body.classList.contains('intro-running')) return;
      var card = e.target.closest('.card');
      if (!card || !card.matches(':focus-visible')) return;
      Camera.flyTo(card.dataset.id, { k: Camera.getState().k });
    });

    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);

    navEl.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-go]');
      if (b) navigate(b.dataset.go);
    });

    function focusables() {
      return Array.prototype.filter.call(
        panel.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]'),
        function (n) { return n.getClientRects().length > 0; }
      );
    }

    document.addEventListener('keydown', function (e) {
      if (state === STATE.CLOSED) {
        if (e.key === 'Escape' && selectedId) clearSelection();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (state !== STATE.OPEN) return;

      if (e.key === 'Tab') {               // focus trap
        var list = focusables();
        if (!list.length) { e.preventDefault(); panel.focus(); return; }
        var first = list[0];
        var last = list[list.length - 1];
        var active = document.activeElement;
        if (!panel.contains(active) || (e.shiftKey && (active === first || active === panel))) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        var btn = navEl.querySelector(e.key === 'ArrowLeft' ? '[data-dir="prev"]' : '[data-dir="next"]');
        if (btn) { e.preventDefault(); navigate(btn.dataset.go); }
      }
    });

    window.Dossier = {
      open: function (id, opts) { if (opts && opts.list) openList(id); else open(id); },
      isOpen: function () { return state !== STATE.CLOSED; }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
 * board.js: renders cards, stamps and strings from js/content.js into #world.
 * Pan/zoom lives in camera.js, which transforms #world. Drag comes later.
 */
(function () {
  'use strict';

  var data = window.CASE;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var world = document.getElementById('world');
  var viewport = document.getElementById('viewport');
  var svg = document.getElementById('strings');
  var W = data.world.width;
  var H = data.world.height;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function byId(id) {
    for (var i = 0; i < data.cards.length; i++) {
      if (data.cards[i].id === id) return data.cards[i];
    }
    return null;
  }

  // ---- stamps ---------------------------------------------------------

  function makeStamp(s) {
    var node = el('span', 'stamp stamp--' + s.tone + (s.size ? ' stamp--' + s.size : ''), s.text);
    node.style.setProperty('--rot', s.rot + 'deg');
    if (s.lang) node.lang = s.lang;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  // ---- cards ----------------------------------------------------------

  function isTodo(text) { return /^TODO/.test(text); }

  function makeIcon(name) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'card__icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = data.icons[name] || '';
    return svg;
  }

  function makeTags(tags) {
    var row = el('span', 'card__tags');
    (tags || []).forEach(function (t) {
      row.appendChild(el('span', 'tag' + (isTodo(t) ? ' is-todo' : ''), t));
    });
    return row;
  }

  function makePreview(rows) {
    var list = el('span', 'card__preview');
    (rows || []).forEach(function (r) {
      list.appendChild(el('span', 'pv__k', r[0]));
      list.appendChild(el('span', 'pv__v' + (isTodo(r[1]) ? ' is-todo' : ''), r[1]));
    });
    return list;
  }

  /*
   * Each card stacks zoom layers. js/content.js drives them, CSS fades them by
   * the board's data-zoom-level:
   *   lvl-far  icon + title        (far only)
   *   lvl-head label + title       (mid, near)
   *   lvl-mid  tags + summary      (mid only)
   *   lvl-near content preview     (near only)
   *   lvl-keep redaction bars      (mid, near)
   * On a polaroid the tags / preview / icon live on the photo instead.
   */
  function makeCard(c) {
    var card = el('button', 'card card--' + c.type + (c.variant ? ' card--' + c.variant : ''));
    var polaroid = c.type === 'polaroid';
    card.type = 'button';
    card.dataset.id = c.id;
    // No aria-label: the accessible name is the card's own visible text (WCAG "label in name"),
    // so it follows the zoom level. The summary is the description, always available.
    card.setAttribute('aria-haspopup', 'dialog');
    var desc = el('span', 'card__desc', c.summary);
    desc.id = 'card-desc-' + c.id;
    desc.hidden = true;
    card.appendChild(desc);
    card.setAttribute('aria-describedby', desc.id);
    card.style.setProperty('--x', c.x - c.w / 2 + 'px');
    card.style.setProperty('--y', c.y - c.h / 2 + 'px');
    card.style.setProperty('--w', c.w + 'px');
    card.style.setProperty('--h', c.h + 'px');
    card.style.setProperty('--rot', c.rot + 'deg');

    // fixtures: a pin, a tape strip, or both. Strings attach at c.pin.
    var fixture = el('span', 'fixture');
    fixture.setAttribute('aria-hidden', 'true');
    fixture.style.left = c.pin.x * 100 + '%';
    fixture.style.top = c.pin.y * 100 + '%';
    if (c.fixture === 'tape' || c.fixture === 'both') fixture.appendChild(el('span', 'tape'));
    if (c.fixture === 'pin' || c.fixture === 'both') {
      fixture.appendChild(el('span', 'pin pin--' + (c.pinColor || 'red')));
    }
    card.appendChild(fixture);

    // the far layer's title is the card's accessible name at far zoom, so it is NOT aria-hidden
    var far = el('span', 'lvl-far');
    far.appendChild(makeIcon(c.icon));
    far.appendChild(el('span', 'lvl-far__title', c.title));

    if (polaroid) {
      var media = el('span', 'card__media');
      media.setAttribute('aria-hidden', 'true');
      media.appendChild(el('span', 'card__placeholder', 'IMAGE: TODO'));
      media.appendChild(far);
      var mediaTags = makeTags(c.tags);
      mediaTags.classList.add('lvl-mid');
      media.appendChild(mediaTags);
      var mediaPreview = makePreview(c.preview);
      mediaPreview.classList.add('lvl-near');
      media.appendChild(mediaPreview);
      card.appendChild(media);
    } else {
      card.appendChild(far);
    }

    var body = el('span', 'card__body');

    var head = el('span', 'lvl-head');
    head.appendChild(el('span', 'card__label', c.label));
    head.appendChild(el('span', 'card__title', c.title));
    if (c.subtitle) head.appendChild(el('span', 'card__subtitle', c.subtitle));
    body.appendChild(head);

    var detail = el('span', 'card__detail');
    var mid = el('span', 'lvl-mid');
    if (!polaroid) mid.appendChild(makeTags(c.tags));
    mid.appendChild(el('span', 'card__summary', c.summary));
    if (c.status) mid.appendChild(el('span', 'card__status', c.status));
    detail.appendChild(mid);
    if (!polaroid) {
      var near = el('span', 'lvl-near');
      near.appendChild(makePreview(c.preview));
      detail.appendChild(near);
    }
    body.appendChild(detail);

    if (c.redacted) {
      var bars = el('span', 'redactions lvl-keep');
      bars.setAttribute('aria-hidden', 'true');
      [86, 64, 92].forEach(function (pct) {
        var bar = el('span', 'redactions__bar');
        bar.style.width = pct + '%';
        bars.appendChild(bar);
      });
      body.appendChild(bars);
    }
    card.appendChild(body);

    (c.stamps || []).forEach(function (s) {
      var stamp = makeStamp(s);
      stamp.style.left = s.at[0] * 100 + '%';
      stamp.style.top = s.at[1] * 100 + '%';
      card.appendChild(stamp);
    });

    // Japan accents: all decorative, so hidden from assistive tech
    if (c.hanko) {
      var h = c.hanko;
      var seal = el('span', 'hanko' + ((h.text || '').length > 1 ? ' hanko--tall' : ''), h.text);
      seal.lang = 'ja';
      seal.setAttribute('aria-hidden', 'true');
      seal.style.setProperty('--rot', h.rot + 'deg');
      seal.style.setProperty('--hs', h.size + 'px');
      seal.style.left = h.at[0] * 100 + '%';
      seal.style.top = h.at[1] * 100 + '%';
      card.appendChild(seal);
    }
    if (c.vertical) {
      var vert = el('span', 'card__vertical', c.vertical);
      vert.lang = 'ja';
      vert.setAttribute('aria-hidden', 'true');
      card.appendChild(vert);
    }
    if (c.washi) {
      card.classList.add('is-washi');
      if (c.washi === 'strong') card.classList.add('is-washi--strong');
    }

    return card;
  }

  // ---- strings --------------------------------------------------------

  var strings = [];          // one record per connection, see renderStrings
  var stringsByCard = {};    // card id -> its strings

  // World-space position of a card's pin, accounting for the card's rotation.
  function pinPoint(c) {
    var px = (c.pin.x - 0.5) * c.w;
    var py = (c.pin.y - 0.5) * c.h;
    var r = c.rot * Math.PI / 180;
    return {
      x: c.x + px * Math.cos(r) - py * Math.sin(r),
      y: c.y + px * Math.sin(r) + py * Math.cos(r)
    };
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  // Redraw one string from the live card positions. s.off nudges the sag control
  // point (sway + twang).
  function drawString(s) {
    var a = pinPoint(s.a);
    var b = pinPoint(s.b);
    var len = Math.hypot(b.x - a.x, b.y - a.y);
    var sag = Math.min(Math.max(len * 0.18, 50), 260) * (s.sag || 1);
    var d = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
      ' Q' + ((a.x + b.x) / 2 + s.off.x).toFixed(1) + ' ' + ((a.y + b.y) / 2 + sag + s.off.y).toFixed(1) +
      ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    for (var i = 0; i < s.paths.length; i++) s.paths[i].setAttribute('d', d);
  }

  function redrawStringsFor(cardId) {
    (stringsByCard[cardId] || []).forEach(drawString);
  }

  /*
   * Each string is a group of paths: two wide, faint strokes that fake the red
   * glow, the cord itself, and a pulse dash. The glow is stacked strokes rather
   * than an SVG blur filter on purpose: a blur over this much board made every
   * drag and sway tick repaint-bound (measured ~8x slower frames), and gets worse
   * zoomed in or on phones.
   */
  function renderStrings() {
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    data.connections.forEach(function (conn, i) {
      var from = byId(conn.from);
      var to = byId(conn.to);
      if (!from || !to) return;

      var group = svgEl('g', { 'class': 'string', 'data-from': conn.from, 'data-to': conn.to });
      var paths = [];
      ['string__glow string__glow--1', 'string__glow string__glow--2', 'string__core'].forEach(function (cls) {
        // pathLength 1000 lets the intro draw each string in with stroke-dashoffset
        var path = svgEl('path', { 'class': cls, pathLength: 1000 });
        group.appendChild(path);
        paths.push(path);
      });
      // a short bright dash that travels along the string while it is highlighted
      var pulse = svgEl('path', { 'class': 'string__pulse', pathLength: 1000 });
      group.appendChild(pulse);
      paths.push(pulse);
      svg.appendChild(group);

      var s = {
        a: from, b: to, sag: conn.sag, group: group, paths: paths,
        off: { x: 0, y: 0 },     // total control-point offset currently drawn
        sway: { x: 0, y: 0 },    // sway part of it (frozen while sway is paused)
        phase: i * 1.7,
        period: 5.5 + (i * 1.37) % 3,
        twang: null
      };
      strings.push(s);
      (stringsByCard[conn.from] = stringsByCard[conn.from] || []).push(s);
      (stringsByCard[conn.to] = stringsByCard[conn.to] || []).push(s);
      drawString(s);
    });
  }

  // ---- init -----------------------------------------------------------

  // dim rising-sun circle behind the board center (under the strings)
  var sunCfg = data.atmosphere && data.atmosphere.sun;
  if (sunCfg) {
    var sun = document.createElement('div');
    sun.className = 'sun';
    sun.setAttribute('aria-hidden', 'true');
    sun.style.left = sunCfg.x - sunCfg.r + 'px';
    sun.style.top = sunCfg.y - sunCfg.r + 'px';
    sun.style.width = sun.style.height = sunCfg.r * 2 + 'px';
    world.insertBefore(sun, svg);
  }

  renderStrings();
  data.boardStamps.forEach(function (s) {
    var stamp = makeStamp(s);
    stamp.classList.add('stamp--board');
    stamp.style.left = s.at[0] + 'px';
    stamp.style.top = s.at[1] + 'px';
    world.appendChild(stamp);
  });
  data.cards.forEach(function (c) { world.appendChild(makeCard(c)); });

  world.style.width = W + 'px';
  world.style.height = H + 'px';

  // ---- semantic zoom --------------------------------------------------

  var zl = data.zoomLevels;
  var level = null;

  function levelFor(k, current) {
    var h = zl.hysteresis || 0;
    if (current === 'far') return k >= zl.mid + h ? levelFor(k, 'mid') : 'far';
    if (current === 'mid') {
      if (k < zl.mid - h) return 'far';
      return k >= zl.near + h ? 'near' : 'mid';
    }
    if (current === 'near') return k < zl.near - h ? levelFor(k, 'mid') : 'near';
    return k < zl.mid ? 'far' : k < zl.near ? 'mid' : 'near';
  }

  // camera.js calls this on every camera change; the DOM is only touched when the level changes
  window.Camera.onChange(function (cam) {
    var next = levelFor(cam.k, level);
    if (next === level) return;
    level = next;
    world.setAttribute('data-zoom-level', level);
  });

  // ---- shared state for the interactions below ------------------------

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var TILT = 6;              // max hover tilt, degrees
  var DRAG_THRESHOLD = 5;    // px before a press becomes a drag
  var EDGE = 150;            // cards can't be dragged closer than this to the world edge

  var hoverCard = null;      // { el, c, strings, linked }
  var drag = null;
  var dragging = false;      // a card is actually moving (past the threshold)
  var swallowDrop = false;
  var zTop = 10;             // stacking order: the last card dropped sits on top

  function dossierOpen() { return document.body.classList.contains('dossier-open'); }
  function introRunning() { return document.body.classList.contains('intro-running'); }
  function listMode() { return document.documentElement.classList.contains('list-mode'); }
  // while a card is focused (click -> dossier) or the intro plays, hover and drag stay out of the way
  function busy() { return world.classList.contains('has-focus') || dossierOpen() || introRunning(); }

  function cardAt(id) { return world.querySelector('.card[data-id="' + id + '"]'); }

  function connectedIds(id) {
    var out = [];
    data.connections.forEach(function (c) {
      if (c.from === id) out.push(c.to);
      else if (c.to === id) out.push(c.from);
    });
    return out;
  }

  function worldPoint(clientX, clientY) {
    var st = Camera.getState();
    return { x: (clientX - st.x) / st.k, y: (clientY - st.y) / st.k };
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // ---- string sway + twang --------------------------------------------
  // One rAF loop, ~30fps, that only runs while there is something to animate and
  // it is safe to: tab visible, camera idle, no drag, dossier closed. Sway time
  // only advances while running, so it resumes exactly where it paused.

  var SWAY_SLOW_MS = 100;
  var SWAY_FRAME_MS = 38;    // ~25fps is plenty for motion this small
  var SWAY_AMP = 14;         // control point travel, world units (the curve moves half that)
  var TWANG_AMP = 38;
  var TWANG_TAU = 0.4;       // s, decay
  var TWANG_HZ = 6.5;
  var TWANG_LEN = 1.4;       // s

  var motion = { raf: 0, last: 0, swayT: 0, busyUntil: 0, resume: 0, twangs: 0, slow: 0, tooSlow: false };

  // The part of the world currently on screen, in world units.
  function worldView() {
    if (!Camera.getState) return null;     // camera.js has not initialised yet
    var st = Camera.getState();
    return { x0: -st.x / st.k, y0: -st.y / st.k, x1: (viewport.clientWidth - st.x) / st.k, y1: (viewport.clientHeight - st.y) / st.k };
  }

  // Rough test using the two cards a string joins (plus slack for the sag).
  function onScreen(s, v) {
    if (!v) return true;
    var m = 400;
    var x0 = Math.min(s.a.x, s.b.x) - m;
    var x1 = Math.max(s.a.x, s.b.x) + m;
    var y0 = Math.min(s.a.y, s.b.y) - m;
    var y1 = Math.max(s.a.y, s.b.y) + m;
    return x1 >= v.x0 && x0 <= v.x1 && y1 >= v.y0 && y0 <= v.y1;
  }

  function swayAllowed() {
    return !motion.tooSlow && !reduceMotion.matches && !document.hidden && !dragging && !dossierOpen() && !introRunning() && !listMode() &&
      performance.now() >= motion.busyUntil;
  }

  function loopWanted() {
    return !document.hidden && !dragging && (motion.twangs > 0 || swayAllowed());
  }

  function frame(now) {
    motion.raf = 0;
    if (!loopWanted()) { scheduleResume(); return; }
    if (now - motion.last < SWAY_FRAME_MS) { motion.raf = requestAnimationFrame(frame); return; }
    var dt = motion.last ? Math.min(now - motion.last, 100) : SWAY_FRAME_MS;
    // safety net: if ticks keep arriving at under ~10fps for over a second (a bad load
    // spike won't do it), the device can't afford the sway: drop it for the session
    if (motion.last) {
      motion.slow = now - motion.last > SWAY_SLOW_MS ? motion.slow + 1 : 0;
      if (motion.slow >= 12) motion.tooSlow = true;
    }
    motion.last = now;

    var swaying = swayAllowed();
    if (swaying) motion.swayT += dt / 1000;
    var view = worldView();
    var t = motion.swayT;

    strings.forEach(function (s) {
      if (swaying) {
        s.sway.y = SWAY_AMP * Math.sin(2 * Math.PI * t / s.period + s.phase);
        s.sway.x = SWAY_AMP * 0.35 * Math.sin(2 * Math.PI * t / (s.period * 1.3) + s.phase + 1);
      }
      var tx = 0;
      var ty = 0;
      if (s.twang) {
        var tt = (now - s.twang.t0) / 1000;
        if (tt >= TWANG_LEN) {
          s.twang = null;
          motion.twangs--;
        } else {
          ty = s.twang.amp * Math.exp(-tt / TWANG_TAU) * Math.cos(2 * Math.PI * TWANG_HZ * tt);
          tx = ty * 0.3;
        }
      }
      var nx = s.sway.x + tx;
      var ny = s.sway.y + ty;
      // strings off screen keep their last drawn shape and catch up when they come into view
      if ((Math.abs(nx - s.off.x) > 0.04 || Math.abs(ny - s.off.y) > 0.04) && onScreen(s, view)) {
        s.off.x = nx;
        s.off.y = ny;
        drawString(s);
      }
    });
    motion.raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (motion.raf || !loopWanted()) return;
    motion.last = 0;
    motion.raf = requestAnimationFrame(frame);
  }

  // Poll cheaply (only while sway is blocked) until it is allowed again.
  function scheduleResume() {
    if (motion.resume || document.hidden) return;
    var wait = Math.max(motion.busyUntil - performance.now(), 0) + 40;
    if (dossierOpen() || introRunning() || listMode()) wait = Math.max(wait, 500);
    motion.resume = setTimeout(function () {
      motion.resume = 0;
      if (swayAllowed() || motion.twangs > 0) startLoop(); else scheduleResume();
    }, wait);
  }

  function twang(cardId) {
    if (reduceMotion.matches) return;
    (stringsByCard[cardId] || []).forEach(function (s) {
      if (!s.twang) motion.twangs++;
      s.twang = { t0: performance.now(), amp: -TWANG_AMP };   // snaps taut, then rings out
    });
    startLoop();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (motion.raf) { cancelAnimationFrame(motion.raf); motion.raf = 0; }
    } else {
      motion.busyUntil = performance.now() + 250;
      scheduleResume();
    }
  });

  // ---- hover: lift, tilt, brighten strings, outline connected cards ----

  function clearHover() {
    if (!hoverCard) return;
    hoverCard.el.classList.remove('is-hover');
    hoverCard.el.style.removeProperty('--rx');
    hoverCard.el.style.removeProperty('--ry');
    hoverCard.strings.forEach(function (st) { st.group.classList.remove('is-hover-hot'); });
    hoverCard.linked.forEach(function (n) { n.classList.remove('is-hover-linked'); });
    hoverCard = null;
  }

  function enterHover(card) {
    clearHover();
    var id = card.dataset.id;
    var linked = connectedIds(id).map(cardAt).filter(Boolean);
    var hot = stringsByCard[id] || [];
    card.classList.add('is-hover');
    hot.forEach(function (st) { st.group.classList.add('is-hover-hot'); });
    linked.forEach(function (n) { n.classList.add('is-hover-linked'); });
    hoverCard = { el: card, c: byId(id), strings: hot, linked: linked };
  }

  // Tilt follows the cursor, measured in the card's own (rotated) frame.
  function tilt(e) {
    if (reduceMotion.matches || drag) return;
    var c = hoverCard.c;
    var p = worldPoint(e.clientX, e.clientY);
    var r = -c.rot * Math.PI / 180;
    var dx = p.x - c.x;
    var dy = p.y - c.y;
    var lx = dx * Math.cos(r) - dy * Math.sin(r);
    var ly = dx * Math.sin(r) + dy * Math.cos(r);
    hoverCard.el.style.setProperty('--ry', clamp(lx / (c.w / 2), -1, 1) * TILT + 'deg');
    hoverCard.el.style.setProperty('--rx', -clamp(ly / (c.h / 2), -1, 1) * TILT + 'deg');
  }

  world.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || drag) return;
    var card = e.target.closest && e.target.closest('.card');
    if (!card || busy()) { clearHover(); return; }
    if (!hoverCard || hoverCard.el !== card) enterHover(card);
    tilt(e);
  });

  world.addEventListener('pointerleave', function () { if (!drag) clearHover(); });
  world.addEventListener('click', clearHover, true);
  // cards slide under a still cursor while the camera moves: drop the hover instead of leaving it stale
  window.Camera.onChange(function () {
    if (hoverCard && !drag) clearHover();
    motion.busyUntil = performance.now() + 250;
    scheduleResume();
  });

  // ---- dragging -------------------------------------------------------
  // The card follows the world point under the cursor, so the maths is scale-aware
  // by construction (same as dividing pointer deltas by the zoom) and stays right
  // if the zoom changes mid-drag. Mouse/pen only; touch pans the board (camera.js).

  function applyDrag() {
    if (!drag) return;
    drag.raf = 0;
    var c = drag.c;
    var p = worldPoint(drag.lx, drag.ly);
    c.x = clamp(p.x - drag.gx, EDGE, W - EDGE);
    c.y = clamp(p.y - drag.gy, EDGE, H - EDGE);
    drag.el.style.setProperty('--x', c.x - c.w / 2 + 'px');
    drag.el.style.setProperty('--y', c.y - c.h / 2 + 'px');
    redrawStringsFor(c.id);
    if (Camera.syncCard) Camera.syncCard(c.id);
  }

  world.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || e.button !== 0 || busy()) return;
    var card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    var c = byId(card.dataset.id);
    var p = worldPoint(e.clientX, e.clientY);
    drag = {
      el: card, c: c, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY,
      gx: p.x - c.x, gy: p.y - c.y, moved: false, raf: 0
    };
  });

  window.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.pointer) return;
    drag.lx = e.clientX;
    drag.ly = e.clientY;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      dragging = true;
      try { drag.el.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      drag.el.classList.add('is-dragging');
      drag.el.style.removeProperty('--rx');
      drag.el.style.removeProperty('--ry');
      if (hoverCard && hoverCard.el !== drag.el) clearHover();
      if (!hoverCard) enterHover(drag.el);   // strings of the dragged card stay lit
    }
    if (!drag.raf) drag.raf = requestAnimationFrame(applyDrag);
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pointer) return;
    var d = drag;
    drag = null;
    if (d.raf) cancelAnimationFrame(d.raf);
    if (!d.moved) return;                      // a plain click: modal.js handles it
    drag = d;
    applyDrag();
    drag = null;
    dragging = false;
    d.el.classList.remove('is-dragging');
    d.el.style.setProperty('--z', ++zTop);
    swallowDrop = true;                        // the click that follows a drop must not open the card
    setTimeout(function () { swallowDrop = false; }, 60);
    twang(d.c.id);
    startLoop();
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  world.addEventListener('click', function (e) {
    if (!swallowDrop) return;
    swallowDrop = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  // the sway loop starts from the camera.onChange hook above once camera.js has initialised
})();

/*
 * board.js: renders cards, stamps and strings from js/content.js into #world.
 * Pan/zoom lives in camera.js, which transforms #world. Drag comes later.
 */
(function () {
  'use strict';

  var data = window.CASE;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var world = document.getElementById('world');
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
    card.setAttribute('aria-label', c.title + ': ' + c.summary);
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

    var far = el('span', 'lvl-far');
    far.setAttribute('aria-hidden', 'true');
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

    return card;
  }

  // ---- strings --------------------------------------------------------

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

  function sagPath(a, b, sagScale) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var sag = Math.min(Math.max(len * 0.18, 50), 260) * (sagScale || 1);
    var cx = (a.x + b.x) / 2;
    var cy = (a.y + b.y) / 2 + sag;
    return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
      ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
      ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function renderStrings() {
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    var defs = svgEl('defs', {});
    var filter = svgEl('filter', {
      id: 'string-glow', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H
    });
    filter.appendChild(svgEl('feGaussianBlur', { stdDeviation: 7 }));
    defs.appendChild(filter);
    svg.appendChild(defs);

    data.connections.forEach(function (conn) {
      var from = byId(conn.from);
      var to = byId(conn.to);
      if (!from || !to) return;
      var d = sagPath(pinPoint(from), pinPoint(to), conn.sag);
      var group = svgEl('g', { 'class': 'string', 'data-from': conn.from, 'data-to': conn.to });
      group.appendChild(svgEl('path', { 'class': 'string__glow', d: d, filter: 'url(#string-glow)' }));
      group.appendChild(svgEl('path', { 'class': 'string__core', d: d }));
      svg.appendChild(group);
    });
  }

  // ---- init -----------------------------------------------------------

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
})();

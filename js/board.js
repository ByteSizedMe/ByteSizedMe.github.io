/*
 * board.js: renders cards, stamps and strings from js/content.js into #world.
 * Batch 1: static layout only. No camera, drag or animation yet.
 */
(function () {
  'use strict';

  var data = window.CASE;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var viewport = document.getElementById('viewport');
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

  function makeCard(c) {
    var card = el('button', 'card card--' + c.type + (c.variant ? ' card--' + c.variant : ''));
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

    if (c.type === 'polaroid') {
      var media = el('span', 'card__media');
      media.setAttribute('aria-hidden', 'true');
      media.appendChild(el('span', 'card__placeholder', 'IMAGE: TODO'));
      card.appendChild(media);
    }

    var body = el('span', 'card__body');
    body.appendChild(el('span', 'card__label', c.label));
    body.appendChild(el('span', 'card__title', c.title));
    if (c.subtitle) body.appendChild(el('span', 'card__subtitle', c.subtitle));
    body.appendChild(el('span', 'card__summary', c.summary));
    if (c.status) body.appendChild(el('span', 'card__status', c.status));
    if (c.redacted) {
      var bars = el('span', 'redactions');
      bars.setAttribute('aria-hidden', 'true');
      [86, 64, 92, 48].forEach(function (pct) {
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

  // ---- fit world to viewport (simple CSS scale; real camera is Batch 2) -

  function fit() {
    var vw = viewport.clientWidth;
    var vh = viewport.clientHeight;
    var scale = Math.min(vw / W, vh / H);
    world.style.setProperty('--fit', scale);
    world.style.setProperty('--tx', (vw - W * scale) / 2 + 'px');
    world.style.setProperty('--ty', (vh - H * scale) / 2 + 'px');
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
  fit();
  window.addEventListener('resize', fit);
})();

/*
 * list.js: LIST VIEW, a plain vertical stack of the same cards.
 *
 * An accessibility fallback and a lighter mode for slow devices: no camera, no
 * strings, no effects. It is built from js/content.js like the board, and opens
 * the same dossier (js/modal.js) with a simple fade.
 *
 * The board/list choice is kept for the session; ?view=list or ?view=board
 * overrides it. The switch to list happens in the page head (html.list-mode)
 * before first paint when it was already chosen.
 */
(function () {
  'use strict';

  var KEY = 'bytesized.view';

  function init() {
    var data = window.CASE;
    var root = document.getElementById('list-view');
    var sw = document.getElementById('view-switch');
    if (!data || !root || !sw) return;

    var html = document.documentElement;

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    // plain text, with everything from "TODO" onward marked as a placeholder
    function rich(parent, text) {
      var i = text.indexOf('TODO');
      if (i < 0) { parent.appendChild(document.createTextNode(text)); return; }
      if (i > 0) parent.appendChild(document.createTextNode(text.slice(0, i)));
      parent.appendChild(el('span', 'is-todo', text.slice(i)));
    }

    // ---- build the list -------------------------------------------------

    var head = el('header', 'list-view__head');
    head.appendChild(el('p', 'list-view__case', data.site.caseNo));
    head.appendChild(el('h1', 'list-view__title', data.site.name));
    head.appendChild(el('p', 'list-view__tagline', data.site.tagline));
    root.appendChild(head);

    // same order as PREVIOUS / NEXT in the case file (data.tour)
    var order = (data.tour || []).map(function (id) {
      return data.cards.filter(function (c) { return c.id === id; })[0];
    }).filter(Boolean);
    data.cards.forEach(function (c) { if (order.indexOf(c) < 0) order.push(c); });

    var ul = el('ul', 'list-view__items');
    order.forEach(function (c) {
      var li = el('li', 'list-view__li');
      var btn = el('button', 'list-item list-item--' + c.type + (c.variant ? ' list-item--' + c.variant : ''));
      btn.type = 'button';
      btn.dataset.id = c.id;
      btn.setAttribute('aria-haspopup', 'dialog');

      btn.appendChild(el('span', 'list-item__label', c.label));
      btn.appendChild(el('span', 'list-item__title', c.title));
      var summary = el('span', 'list-item__summary');
      rich(summary, c.summary);
      btn.appendChild(summary);

      if (c.tags && c.tags.length) {
        var tags = el('span', 'list-item__tags');
        c.tags.forEach(function (t) {
          tags.appendChild(el('span', 'list-item__tag' + (/^TODO/.test(t) ? ' is-todo' : ''), t));
        });
        btn.appendChild(tags);
      }
      var open = el('span', 'list-item__open', 'OPEN FILE');
      open.appendChild(el('span', null, ' ›')).setAttribute('aria-hidden', 'true');
      btn.appendChild(open);

      btn.addEventListener('click', function () { window.Dossier.open(c.id, { list: true }); });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    root.appendChild(ul);

    // ---- the switch -----------------------------------------------------

    var buttons = Array.prototype.slice.call(sw.querySelectorAll('button[data-view]'));

    function sync() {
      var list = html.classList.contains('list-mode');
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.view === 'list') === list)); });
    }

    function setView(view) {
      var list = view === 'list';
      if (list === html.classList.contains('list-mode')) return;
      html.classList.toggle('list-mode', list);
      try { sessionStorage.setItem(KEY, view); } catch (e) { /* storage blocked */ }
      if (list) {
        if (window.Camera && Camera.stop) Camera.stop();
        window.scrollTo(0, 0);
      } else {
        // the board was display:none: let the camera re-measure and re-apply its view
        window.dispatchEvent(new Event('resize'));
      }
      sync();
    }

    buttons.forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });

    // a ?view= override is remembered like a click would be
    var q = location.search.match(/[?&]view=(list|board)/);
    if (q) { try { sessionStorage.setItem(KEY, q[1]); } catch (e) { /* storage blocked */ } }
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

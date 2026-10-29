/*
 * resume.js: RESUME PREVIEW, a viewer that opens on top of a case file.
 *
 * A link in js/content.js with kind 'preview' opens it:
 *   { label: 'Preview resume', kind: 'preview', url: 'assets/resume.pdf', image: 'assets/resume-preview.png' }
 * `image` is a picture of the page (phones cannot show a PDF inline, so the picture is what is
 * displayed); `url` is the real PDF, offered for download and to open in a new tab.
 *
 * It is a modal of its own: the case file behind it is made inert, Esc and Tab are handled
 * here (and kept from reaching the case file), and focus returns to the link that opened it.
 */
(function () {
  'use strict';

  var ratio = 1;                       // page height / width, read from the picture
  var STEPS = [1, 1.5, 2, 3];          // zoom steps, as a multiple of "fit width"

  var root, desk, sheet, img, zoomLabel, zoomOut, zoomIn, dl, openTab, closeBtn, notice;
  var opener = null, isOpen = false, zoom = 1, fit = 1, steps = STEPS;
  var inertNode = null;

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function build() {
    root = el('div', 'rv');
    root.hidden = true;

    var scrim = el('div', 'rv__scrim');
    scrim.addEventListener('click', close);

    var frame = el('section', 'rv__frame');
    frame.setAttribute('role', 'dialog');
    frame.setAttribute('aria-modal', 'true');
    frame.setAttribute('aria-labelledby', 'rv-title');

    var tab = el('div', 'rv__tab', 'EXHIBIT R · RESUME');
    tab.setAttribute('aria-hidden', 'true');

    var bar = el('header', 'rv__bar');
    var title = el('h2', 'rv__title', 'Resume preview');
    title.id = 'rv-title';

    var tools = el('div', 'rv__tools');
    zoomOut = button('rv__btn rv__btn--sq', '−', 'Zoom out');
    zoomLabel = el('span', 'rv__zoom', 'FIT');
    zoomLabel.setAttribute('aria-live', 'polite');
    zoomIn = button('rv__btn rv__btn--sq', '+', 'Zoom in');
    var zoomGroup = el('div', 'rv__group');
    zoomGroup.setAttribute('role', 'group');
    zoomGroup.setAttribute('aria-label', 'Zoom');
    zoomGroup.appendChild(zoomOut);
    zoomGroup.appendChild(zoomLabel);
    zoomGroup.appendChild(zoomIn);

    dl = el('a', 'rv__btn rv__btn--solid', 'DOWNLOAD PDF');
    dl.setAttribute('download', '');
    openTab = el('a', 'rv__btn');
    openTab.target = '_blank';
    openTab.rel = 'noopener noreferrer';
    openTab.appendChild(document.createTextNode('OPEN PDF '));
    openTab.appendChild(el('span', null, '↗')).setAttribute('aria-hidden', 'true');
    openTab.setAttribute('aria-label', 'Open the PDF in a new tab');

    closeBtn = el('button', 'rv__close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close resume preview');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5L5 19"/></svg>';
    closeBtn.addEventListener('click', close);

    tools.appendChild(zoomGroup);
    tools.appendChild(dl);
    tools.appendChild(openTab);
    bar.appendChild(title);
    bar.appendChild(tools);

    desk = el('div', 'rv__desk');
    desk.tabIndex = 0;
    desk.setAttribute('role', 'region');
    desk.setAttribute('aria-label', 'Resume page. Scroll to read');

    sheet = el('figure', 'rv__sheet');
    var pin = el('span', 'rv__pin');
    pin.setAttribute('aria-hidden', 'true');
    img = el('img', 'rv__img');
    img.alt = '';
    img.decoding = 'async';
    notice = el('p', 'rv__notice');
    notice.hidden = true;
    sheet.appendChild(pin);
    sheet.appendChild(img);
    desk.appendChild(sheet);
    desk.appendChild(notice);

    frame.appendChild(tab);
    frame.appendChild(closeBtn);
    frame.appendChild(bar);
    frame.appendChild(desk);
    root.appendChild(scrim);
    root.appendChild(frame);
    document.body.appendChild(root);

    zoomOut.addEventListener('click', function () { step(-1); });
    zoomIn.addEventListener('click', function () { step(1); });
    img.addEventListener('load', function () {
      ratio = img.naturalHeight / img.naturalWidth || 1;
      notice.hidden = true;
      sheet.hidden = false;
      layout(true);
    });
    img.addEventListener('error', function () {
      sheet.hidden = true;
      notice.hidden = false;
      notice.textContent = 'The preview picture could not be loaded. Use DOWNLOAD PDF or OPEN PDF instead.';
    });
    window.addEventListener('resize', function () { if (isOpen) layout(false); });
    window.addEventListener('keydown', onKey, true);
  }

  function button(cls, text, label) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    return b;
  }

  // ---- zoom -------------------------------------------------------------

  // "Fit" is the whole page on a roomy screen and the page width on a phone (where a whole page
  // would be too small to read); the steps above it are multiples of the page width.
  function layout(reset) {
    var cs = getComputedStyle(desk);
    var w = desk.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = desk.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var base = Math.min(w, 900);
    var whole = Math.min(1, h / (base * ratio));
    fit = window.innerWidth >= 700 ? Math.max(0.5, whole) : 1;
    steps = [fit].concat(STEPS.filter(function (s) { return s > fit + 0.01; }));
    if (reset) zoom = 0;
    else zoom = Math.min(zoom, steps.length - 1);
    apply(base);
  }

  function apply(base) {
    if (base == null) {
      var cs = getComputedStyle(desk);
      base = Math.min(desk.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), 900);
    }
    var z = steps[zoom];
    sheet.style.width = Math.round(base * z) + 'px';
    zoomLabel.textContent = zoom === 0 ? 'FIT' : Math.round(z * 100) + '%';
    zoomOut.disabled = zoom === 0;
    zoomIn.disabled = zoom === steps.length - 1;
  }

  function step(dir) {
    var next = Math.max(0, Math.min(steps.length - 1, zoom + dir));
    if (next === zoom) return;
    var cx = desk.scrollLeft + desk.clientWidth / 2;
    var cy = desk.scrollTop + desk.clientHeight / 2;
    var before = sheet.offsetWidth || 1;
    zoom = next;
    apply();
    var f = (sheet.offsetWidth || 1) / before;      // keep what is in the middle in the middle
    desk.scrollLeft = cx * f - desk.clientWidth / 2;
    desk.scrollTop = cy * f - desk.clientHeight / 2;
  }

  // ---- open / close -----------------------------------------------------

  function open(link, from) {
    if (isOpen) return;
    if (!root) build();
    opener = from || document.activeElement;
    img.alt = link.alt || 'Resume of Malhar Srivatsav, one page: education, experience, projects, technical skills and achievements.';
    dl.href = link.url;
    openTab.href = link.url;
    notice.hidden = true;
    sheet.hidden = false;
    if (img.getAttribute('src') !== link.image) img.src = link.image;
    root.hidden = false;
    isOpen = true;

    inertNode = document.getElementById('dossier');
    if (inertNode) inertNode.inert = true;
    document.body.classList.add('rv-open');

    if (img.complete && img.naturalWidth) ratio = img.naturalHeight / img.naturalWidth;
    layout(true);
    desk.scrollTop = 0;
    desk.scrollLeft = 0;
    root.classList.remove('is-in');
    void root.offsetWidth;                         // restart the entrance animation
    root.classList.add('is-in');
    desk.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    root.hidden = true;
    document.body.classList.remove('rv-open');
    if (inertNode) { inertNode.inert = false; inertNode = null; }
    if (opener && opener.focus) opener.focus({ preventScroll: true });
    opener = null;
  }

  function focusables() {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]'),
      function (n) { return n.getClientRects().length > 0; }
    );
  }

  // Runs before the case file's own key handling (window, capture) and keeps these keys from it.
  function onKey(e) {
    if (!isOpen) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); step(1); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); step(-1); return; }
    if (e.key === 'Tab') {
      var list = focusables();
      if (!list.length) { e.preventDefault(); return; }
      var first = list[0], last = list[list.length - 1], a = document.activeElement;
      if (!root.contains(a)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    }
  }

  window.ResumeViewer = { open: open, close: close };
})();

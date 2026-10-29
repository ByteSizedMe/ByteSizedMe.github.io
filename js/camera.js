/*
 * camera.js: pan, zoom, tweens, fit-all, fly-to, minimap, inertia, HUD.
 *
 * The camera moves and scales ONE element (#world) with
 * transform: translate() scale(). Cards and the string SVG live inside it, so
 * strings follow for free and are never re-rendered while the camera moves.
 *
 * Camera state is { x, y, k }: world origin position in screen px, and scale.
 * Public API: window.Camera = { flyTo, fitAll, reset, zoomBy, getState, getView,
 * flyToView, stop, syncCard, onChange }.
 * onChange(fn) calls fn(state) on every camera change; it can be called before init.
 */
(function () {
  'use strict';

  var listeners = [];
  var liveState = null;   // set once init has run
  window.Camera = {
    onChange: function (fn) {
      listeners.push(fn);
      if (liveState) fn(liveState);
    }
  };

  var MIN_K = 0.3;          // hard floor, lowered on small screens so FIT ALL always fits
  var MAX_K = 2.5;
  var TWEEN_MIN = 600;      // ms
  var TWEEN_MAX = 900;
  var PAN_THRESHOLD = 6;    // px before a press becomes a pan
  var INERTIA_TAU = 260;    // ms, velocity decay time constant
  var ZOOM_SMOOTH = 80;     // ms, wheel/pinch zoom smoothing time constant
  var KEY_PAN_SPEED = 0.9;  // px per ms
  var KEY_ZOOM_STEP = 1.35;
  var BOUNDS_PAD = 80;      // world units around the cards for FIT ALL

  function init() {
    var data = window.CASE;
    var viewport = document.getElementById('viewport');
    var world = document.getElementById('world');
    var hud = document.getElementById('hud');
    var readout = document.getElementById('zoom-readout');
    var minimap = document.getElementById('minimap');
    var minimapView = document.getElementById('minimap-view');
    if (!data || !viewport || !world) return;

    var W = data.world.width;
    var H = data.world.height;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    var cam = { x: 0, y: 0, k: 1 };
    liveState = cam;
    var vw = 0;
    var vh = 0;
    var minK = MIN_K;
    var fit = { cx: W / 2, cy: H / 2, k: 0.5 };
    var fitMode = true;   // true while the view is "fit all": resizes re-fit

    // ---- math helpers -------------------------------------------------

    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function clampK(k) { return Math.min(MAX_K, Math.max(minK, k)); }

    // Keep at least 20% of the viewport covered by the world so you can't lose the board.
    function clampX(x, k) { return Math.min(vw * 0.8, Math.max(vw * 0.2 - W * k, x)); }
    function clampY(y, k) { return Math.min(vh * 0.8, Math.max(vh * 0.2 - H * k, y)); }

    function center() {
      return { cx: (vw / 2 - cam.x) / cam.k, cy: (vh / 2 - cam.y) / cam.k, k: cam.k };
    }

    // ---- bounds for FIT ALL ------------------------------------------

    function stampHalf(size) {
      if (size === 'xl') return [260, 110];
      if (size === 'lg') return [200, 60];
      return [120, 40];
    }

    function computeFit() {
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      function extend(ax, ay, bx, by) {
        x0 = Math.min(x0, ax); y0 = Math.min(y0, ay);
        x1 = Math.max(x1, bx); y1 = Math.max(y1, by);
      }
      data.cards.forEach(function (c) {
        var r = c.rot * Math.PI / 180;
        var cos = Math.abs(Math.cos(r));
        var sin = Math.abs(Math.sin(r));
        var hw = (c.w * cos + c.h * sin) / 2;
        var hh = (c.w * sin + c.h * cos) / 2;
        extend(c.x - hw, c.y - hh, c.x + hw, c.y + hh);
      });
      (data.boardStamps || []).forEach(function (s) {
        var h = stampHalf(s.size);
        extend(s.at[0] - h[0], s.at[1] - h[1], s.at[0] + h[0], s.at[1] + h[1]);
      });
      x0 = Math.max(0, x0 - BOUNDS_PAD); y0 = Math.max(0, y0 - BOUNDS_PAD);
      x1 = Math.min(W, x1 + BOUNDS_PAD); y1 = Math.min(H, y1 + BOUNDS_PAD);
      var k = Math.min(vw / (x1 - x0), vh / (y1 - y0));
      minK = Math.min(MIN_K, k);
      fit = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, k: Math.min(MAX_K, k) };
    }

    function measure() {
      vw = viewport.clientWidth;
      vh = viewport.clientHeight;
      computeFit();
    }

    // ---- applying the view -------------------------------------------

    var lastPercent = '';

    function updateMinimap() {
      if (!minimapView) return;
      var mw = minimap.clientWidth;
      if (!mw) return;
      var s = mw / W;
      minimapView.style.left = (-cam.x / cam.k) * s + 'px';
      minimapView.style.top = (-cam.y / cam.k) * s + 'px';
      minimapView.style.width = (vw / cam.k) * s + 'px';
      minimapView.style.height = (vh / cam.k) * s + 'px';
    }

    function render() {
      world.style.transform = 'translate(' + cam.x + 'px,' + cam.y + 'px) scale(' + cam.k + ')';
      var pct = Math.round(cam.k * 100) + '%';
      if (readout && pct !== lastPercent) { readout.textContent = pct; lastPercent = pct; }
      updateMinimap();
      for (var i = 0; i < listeners.length; i++) listeners[i](cam);
    }

    function setView(x, y, k) {
      k = clampK(k);
      cam.k = k;
      cam.x = clampX(x, k);
      cam.y = clampY(y, k);
      render();
    }

    function setViewFromCenter(cx, cy, k) { setView(vw / 2 - cx * k, vh / 2 - cy * k, k); }

    function panBy(dx, dy) { setView(cam.x + dx, cam.y + dy, cam.k); }

    // Zoom so the world point under (px, py) stays under (px, py).
    function zoomAt(px, py, k) {
      k = clampK(k);
      var r = k / cam.k;
      setView(px - (px - cam.x) * r, py - (py - cam.y) * r, k);
    }

    // ---- motion state: tween, inertia, smoothed zoom, key panning -----

    var anim = null;       // { raf, resolve }
    var tweenTarget = null;
    var inertia = null;
    var zoomGoal = null;   // { k, px, py }
    var zoomRaf = 0;
    var keys = {};
    var keyRaf = 0;

    function stopTween() {
      if (anim) { cancelAnimationFrame(anim.raf); anim.resolve(false); anim = null; }
      tweenTarget = null;
    }
    function stopInertia() { if (inertia) { cancelAnimationFrame(inertia.raf); inertia = null; } }
    function stopZoom() { if (zoomRaf) { cancelAnimationFrame(zoomRaf); zoomRaf = 0; } zoomGoal = null; }
    function stopMotion() { stopTween(); stopInertia(); stopZoom(); }

    // Any direct user input: take over from whatever the camera was doing.
    function takeOver() { stopMotion(); fitMode = false; }

    // Clamp a target and report the center that actually results.
    function solve(cx, cy, k) {
      k = clampK(k);
      var x = clampX(vw / 2 - cx * k, k);
      var y = clampY(vh / 2 - cy * k, k);
      return { cx: (vw / 2 - x) / k, cy: (vh / 2 - y) / k, k: k };
    }

    function durationFor(from, to) {
      var kmax = Math.max(from.k, to.k);
      var dist = Math.hypot((to.cx - from.cx) * kmax, (to.cy - from.cy) * kmax);
      var f = Math.min(1, dist / Math.hypot(vw, vh) + Math.abs(Math.log(to.k / from.k)) / 2);
      return TWEEN_MIN + (TWEEN_MAX - TWEEN_MIN) * f;
    }

    // Eased camera move. Zoom is interpolated in log space and the center point
    // linearly in world space, which keeps long flights smooth. Resolves true on
    // arrival, false if something interrupted it.
    // `arc` (world units) bows the path downward at its midpoint, so a flight between
    // two cards can follow the sag of the string that joins them.
    function animateTo(cx, cy, k, arc) {
      var to = solve(cx, cy, k);
      var from = center();
      stopMotion();
      fitMode = false;

      var tiny = Math.abs(to.cx - from.cx) < 0.5 && Math.abs(to.cy - from.cy) < 0.5 &&
        Math.abs(Math.log(to.k / from.k)) < 0.001;
      if (tiny) return Promise.resolve(true);
      if (reduceMotion.matches) {
        setViewFromCenter(to.cx, to.cy, to.k);
        return Promise.resolve(true);
      }

      var duration = durationFor(from, to);
      return new Promise(function (resolve) {
        var start = null;
        var lk0 = Math.log(from.k);
        var lk1 = Math.log(to.k);
        anim = { raf: 0, resolve: resolve };
        tweenTarget = to;
        function step(now) {
          if (start === null) start = now;
          var p = Math.min(1, (now - start) / duration);
          var e = easeInOutCubic(p);
          setViewFromCenter(lerp(from.cx, to.cx, e), lerp(from.cy, to.cy, e) + 4 * e * (1 - e) * (arc || 0),
            Math.exp(lerp(lk0, lk1, e)));
          if (p < 1) {
            anim.raf = requestAnimationFrame(step);
          } else {
            anim = null;
            tweenTarget = null;
            resolve(true);
          }
        }
        anim.raf = requestAnimationFrame(step);
      });
    }

    function byId(id) {
      for (var i = 0; i < data.cards.length; i++) if (data.cards[i].id === id) return data.cards[i];
      return null;
    }

    // ---- public moves --------------------------------------------------

    function flyTo(id, opts) {
      var card = byId(id);
      if (!card) return Promise.resolve(false);
      var k = (opts && opts.k) || card.zoomFocus || 1;
      // never zoom in so far that the card spills out of the viewport
      k = Math.min(k, (0.9 * vw) / card.w, (0.9 * vh) / card.h);
      return animateTo(card.x, card.y, k, opts && opts.arc);
    }

    function fitAll() {
      computeFit();   // cards may have been dragged since the last measure
      return animateTo(fit.cx, fit.cy, fit.k).then(function (arrived) {
        if (arrived) fitMode = true;
        return arrived;
      });
    }

    // "Reset" is the home view: the Subject File centered at 100%.
    function reset() {
      return byId('profile') ? flyTo('profile', { k: 1 }) : fitAll();
    }

    // A restorable view: center + scale, plus whether it was "fit all" (so it re-fits on resize).
    function getView() {
      var c = center();
      return { cx: c.cx, cy: c.cy, k: c.k, fit: fitMode };
    }

    function flyToView(v) {
      if (v.fit) return fitAll();
      return animateTo(v.cx, v.cy, v.k);
    }

    function zoomBy(factor) {
      var base = tweenTarget || center();
      return animateTo(base.cx, base.cy, base.k * factor);
    }

    // ---- wheel / trackpad pinch (smoothed) ------------------------------

    function startZoomLoop() {
      if (zoomRaf) return;
      var last = null;
      function step(now) {
        var dt = last === null ? 16 : Math.min(now - last, 50);
        last = now;
        if (!zoomGoal) { zoomRaf = 0; return; }
        var lk = Math.log(cam.k);
        var goal = Math.log(zoomGoal.k);
        lk += (goal - lk) * (1 - Math.exp(-dt / ZOOM_SMOOTH));
        var done = Math.abs(goal - lk) < 0.0005;
        zoomAt(zoomGoal.px, zoomGoal.py, Math.exp(done ? goal : lk));
        if (done) { zoomGoal = null; zoomRaf = 0; } else { zoomRaf = requestAnimationFrame(step); }
      }
      zoomRaf = requestAnimationFrame(step);
    }

    function wheelZoom(e) {
      stopTween();
      stopInertia();
      fitMode = false;
      var dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= vh;
      dy = Math.max(-120, Math.min(120, dy));
      // ctrl+wheel is how browsers report a trackpad pinch: those deltas are small
      var factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015));
      var base = zoomGoal ? zoomGoal.k : cam.k;
      zoomGoal = { k: clampK(base * factor), px: e.clientX, py: e.clientY };
      startZoomLoop();
    }

    // The dossier overlay owns the screen while it is open: no camera input.
    function locked() { return document.body.classList.contains('dossier-open'); }

    document.addEventListener('wheel', function (e) {
      if (locked()) {
        if (e.ctrlKey) e.preventDefault();
        return;
      }
      if (e.target.closest && e.target.closest('.hud, .minimap')) {
        if (e.ctrlKey) e.preventDefault();   // keep the page itself from zooming
        return;
      }
      e.preventDefault();
      wheelZoom(e);
    }, { passive: false });

    // Safari reports trackpad pinch as gesture events instead of ctrl+wheel.
    var gestureK = 1;
    document.addEventListener('gesturestart', function (e) {
      e.preventDefault();
      takeOver();
      gestureK = cam.k;
    });
    document.addEventListener('gesturechange', function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gestureK * e.scale);
    });
    document.addEventListener('gestureend', function (e) { e.preventDefault(); });

    // ---- pointer: drag to pan, two-finger pinch -----------------------

    var pointers = {};     // pointerId -> { x, y }
    var pan = null;        // { id, startX, startY, lastX, lastY, moved, noInertia, samples }
    var pinch = null;      // { mx, my, d }
    var swallowClick = false;

    function pointerCount() { return Object.keys(pointers).length; }

    function pinchState() {
      var ids = Object.keys(pointers);
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      return {
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
      };
    }

    // after a pan or pinch, the browser's click must not open/activate a card
    function swallowNextClick() {
      swallowClick = true;
      setTimeout(function () { swallowClick = false; }, 60);
    }

    viewport.addEventListener('click', function (e) {
      if (!swallowClick) return;
      swallowClick = false;
      e.stopPropagation();
      e.preventDefault();
    }, true);

    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // a mouse or pen press on a card is for the card (board.js drags it);
      // touch can pan from anywhere, since cards cover most of the wall when zoomed in
      if (e.pointerType !== 'touch' && e.target.closest('.card')) return;

      takeOver();
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var n = pointerCount();
      if (n === 1) {
        pan = {
          id: e.pointerId, startX: e.clientX, startY: e.clientY,
          lastX: e.clientX, lastY: e.clientY, moved: false, noInertia: false, samples: []
        };
      } else if (n === 2) {
        pan = null;
        viewport.classList.remove('is-panning');
        pinch = pinchState();
        swallowNextClick();
      }
    });

    window.addEventListener('pointermove', function (e) {
      var p = pointers[e.pointerId];
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;

      if (pinch) {
        var s = pinchState();
        panBy(s.mx - pinch.mx, s.my - pinch.my);
        zoomAt(s.mx, s.my, cam.k * s.d / pinch.d);
        pinch = s;
        return;
      }

      if (!pan || pan.id !== e.pointerId) return;
      if (!pan.moved) {
        if (Math.hypot(e.clientX - pan.startX, e.clientY - pan.startY) < PAN_THRESHOLD) return;
        pan.moved = true;
        viewport.classList.add('is-panning');
        try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      }
      panBy(e.clientX - pan.lastX, e.clientY - pan.lastY);
      pan.lastX = e.clientX;
      pan.lastY = e.clientY;
      var now = performance.now();
      pan.samples.push({ t: now, x: e.clientX, y: e.clientY });
      while (pan.samples.length > 2 && now - pan.samples[0].t > 100) pan.samples.shift();
    });

    function startInertia(vx, vy) {
      stopInertia();
      var last = null;
      inertia = { raf: 0 };
      function step(now) {
        if (last === null) { last = now; inertia.raf = requestAnimationFrame(step); return; }
        var dt = Math.min(now - last, 50);
        last = now;
        var decay = Math.exp(-dt / INERTIA_TAU);
        vx *= decay;
        vy *= decay;
        var ox = cam.x;
        var oy = cam.y;
        setView(ox + vx * dt, oy + vy * dt, cam.k);
        if (cam.x === ox) vx = 0;     // hit the edge
        if (cam.y === oy) vy = 0;
        if (Math.hypot(vx, vy) < 0.02) { inertia = null; return; }
        inertia.raf = requestAnimationFrame(step);
      }
      inertia.raf = requestAnimationFrame(step);
    }

    function releaseWithInertia() {
      if (reduceMotion.matches) return;
      var s = pan.samples;
      if (s.length < 2) return;
      var first = s[0];
      var last = s[s.length - 1];
      var dt = last.t - first.t;
      if (dt < 10 || performance.now() - last.t > 80) return;   // finger rested before release
      var vx = (last.x - first.x) / dt;
      var vy = (last.y - first.y) / dt;
      var speed = Math.hypot(vx, vy);
      if (speed < 0.1) return;
      var cap = Math.min(1, 4 / speed);
      startInertia(vx * cap, vy * cap);
    }

    function pointerEnd(e) {
      if (!pointers[e.pointerId]) return;
      delete pointers[e.pointerId];
      var n = pointerCount();

      if (pinch) {
        if (n < 2) {
          pinch = null;
          swallowNextClick();
          if (n === 1) {
            // keep panning with the finger that is left, without a jump
            var id = Number(Object.keys(pointers)[0]);
            var rest = pointers[id];
            pan = {
              id: id, startX: rest.x, startY: rest.y, lastX: rest.x, lastY: rest.y,
              moved: true, noInertia: true, samples: []
            };
          }
        }
        return;
      }

      if (pan && pan.id === e.pointerId) {
        if (pan.moved) {
          swallowNextClick();
          if (!pan.noInertia && e.type === 'pointerup') releaseWithInertia();
        }
        pan = null;
        viewport.classList.remove('is-panning');
      }
    }

    window.addEventListener('pointerup', pointerEnd);
    window.addEventListener('pointercancel', pointerEnd);

    // Focusing an off-screen card must not scroll the clipped viewport itself.
    viewport.addEventListener('scroll', function () {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });

    // ---- keyboard ------------------------------------------------------

    function startKeyLoop() {
      if (keyRaf) return;
      var last = null;
      function step(now) {
        var dt = last === null ? 16 : Math.min(now - last, 50);
        last = now;
        var dx = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0);
        var dy = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
        if (!dx && !dy) { keyRaf = 0; return; }
        panBy(dx * KEY_PAN_SPEED * dt, dy * KEY_PAN_SPEED * dt);
        keyRaf = requestAnimationFrame(step);
      }
      keyRaf = requestAnimationFrame(step);
    }

    function isTyping(t) {
      return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    }

    document.addEventListener('keydown', function (e) {
      if (locked() || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      var key = e.key;
      if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        if (!keys[key]) { keys[key] = true; takeOver(); }
        startKeyLoop();
      } else if (key === '+' || key === '=') {
        e.preventDefault();
        zoomBy(KEY_ZOOM_STEP);
      } else if (key === '-' || key === '_') {
        e.preventDefault();
        zoomBy(1 / KEY_ZOOM_STEP);
      } else if (key === '0') {
        e.preventDefault();
        if (!e.repeat) fitAll();
      }
    });

    document.addEventListener('keyup', function (e) { delete keys[e.key]; });
    window.addEventListener('blur', function () { keys = {}; });

    // ---- HUD buttons ---------------------------------------------------

    if (hud) {
      hud.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cam]');
        if (!btn) return;
        var action = btn.getAttribute('data-cam');
        if (action === 'zoom-in') zoomBy(KEY_ZOOM_STEP);
        else if (action === 'zoom-out') zoomBy(1 / KEY_ZOOM_STEP);
        else if (action === 'fit') fitAll();
        else if (action === 'reset') reset();
      });
    }

    // ---- minimap -------------------------------------------------------

    if (minimap) {
      var dots = {};
      data.cards.forEach(function (c) {
        var dot = document.createElement('span');
        dot.className = 'minimap__dot';
        dots[c.id] = dot;
        minimap.appendChild(dot);
      });

      // cards move when dragged: board.js calls this to keep the dots in step
      window.Camera.syncCard = function (id) {
        var c = byId(id);
        if (!c || !dots[id]) return;
        dots[id].style.left = (c.x / W) * 100 + '%';
        dots[id].style.top = (c.y / H) * 100 + '%';
      };
      data.cards.forEach(function (c) { window.Camera.syncCard(c.id); });

      var mm = null;   // { sx, sy, moved }

      var mmPoint = function (e) {
        var r = minimap.getBoundingClientRect();
        return {
          x: Math.min(W, Math.max(0, ((e.clientX - r.left) / r.width) * W)),
          y: Math.min(H, Math.max(0, ((e.clientY - r.top) / r.height) * H))
        };
      };

      minimap.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        minimap.setPointerCapture(e.pointerId);
        mm = { sx: e.clientX, sy: e.clientY, moved: false };
      });

      minimap.addEventListener('pointermove', function (e) {
        if (!mm) return;
        if (!mm.moved && Math.hypot(e.clientX - mm.sx, e.clientY - mm.sy) < 4) return;
        // dragging the minimap scrubs the camera directly; a plain click is tweened below
        mm.moved = true;
        takeOver();
        var p = mmPoint(e);
        setViewFromCenter(p.x, p.y, cam.k);
      });

      var mmEnd = function (e) {
        if (!mm) return;
        var wasClick = !mm.moved && e.type === 'pointerup';
        mm = null;
        if (wasClick) {
          var p = mmPoint(e);
          animateTo(p.x, p.y, cam.k);
        }
      };
      minimap.addEventListener('pointerup', mmEnd);
      minimap.addEventListener('pointercancel', mmEnd);
    }

    // ---- resize --------------------------------------------------------

    window.addEventListener('resize', function () {
      var c = center();
      measure();
      stopTween();
      if (fitMode) setViewFromCenter(fit.cx, fit.cy, fit.k);
      else setViewFromCenter(c.cx, c.cy, c.k);
    });

    // ---- start: fit all, no tween on first paint ----------------------

    measure();
    setViewFromCenter(fit.cx, fit.cy, fit.k);

    window.Camera.flyTo = flyTo;
    window.Camera.fitAll = fitAll;
    window.Camera.reset = reset;
    window.Camera.zoomBy = zoomBy;
    window.Camera.getView = getView;
    window.Camera.flyToView = flyToView;
    window.Camera.stop = stopMotion;
    window.Camera.getState = function () { return { x: cam.x, y: cam.y, k: cam.k }; };
  }

  // board.js (loaded after this file) renders the cards; wait for it.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

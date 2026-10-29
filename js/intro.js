/*
 * intro.js: the opening sequence and the board's atmosphere.
 *
 *   - Intro: opens tight on the Subject File, the stamp slams down, the camera
 *     pulls back to the full board while the strings draw in one by one and the
 *     cards drop onto the wall. SKIP INTRO (or Esc) jumps to the end. It plays
 *     once per session and never under prefers-reduced-motion: the decision is
 *     made in a tiny script in <head> (before first paint) that sets
 *     html.intro-pending. ?intro=1 replays it, ?intro=0 skips it.
 *   - Stamps: a card's stamps slam in (scale 1.6 -> 1) the first time that card is
 *     on screen at near zoom.
 *   - Cursor spotlight (mouse only) and drifting sakura petals (CSS animations).
 *
 * All motion is switched off under prefers-reduced-motion.
 */
(function () {
  'use strict';

  var SEEN_KEY = 'bytesized.intro';

  // Intro timeline, ms from the start.
  var T = {
    heroDrop: 150, heroDropMs: 850,
    slam: 1050, slamMs: 420,
    pull: 1900, pullMs: 1400,         // the only camera move longer than 900ms
    cards: 2000, cardStagger: 170, cardMs: 900,
    strings: 2250, stringStagger: 250, stringMs: 750,
    boardStamps: 3900, boardStampStagger: 220, boardStampMs: 420,
    sun: 1700, sunMs: 2200
  };

  function init() {
    var data = window.CASE;
    var world = document.getElementById('world');
    var viewport = document.getElementById('viewport');
    if (!data || !world || !viewport || !window.Camera) return;

    var html = document.documentElement;
    var body = document.body;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function noop() {}
    function byId(id) {
      for (var i = 0; i < data.cards.length; i++) if (data.cards[i].id === id) return data.cards[i];
      return null;
    }
    function cardEl(id) { return world.querySelector('.card[data-id="' + id + '"]'); }
    
    // ---- cursor spotlight ------------------------------------------------
    // A radial gradient overlay follows the pointer (rAF-throttled CSS variables).
    // Off for touch input and under reduced motion.

    (function spotlight() {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      var el = document.createElement('div');
      el.className = 'spotlight';
      el.setAttribute('aria-hidden', 'true');
      viewport.appendChild(el);

      var x = 0;
      var y = 0;
      var raf = 0;
      var disabled = false;

      function paint() {
        raf = 0;
        el.style.setProperty('--sx', x + 'px');
        el.style.setProperty('--sy', y + 'px');
      }

      function onPointer(e) {
        if (disabled) return;
        if (e.pointerType === 'touch') {           // a touch device: never show it
          disabled = true;
          el.classList.remove('is-on');
          return;
        }
        if (reduce.matches) return;
        x = e.clientX;
        y = e.clientY;
        el.classList.add('is-on');
        if (!raf) raf = requestAnimationFrame(paint);
      }

      document.addEventListener('pointermove', onPointer);
      document.addEventListener('pointerdown', onPointer);
      document.documentElement.addEventListener('mouseleave', function () { el.classList.remove('is-on'); });
    })();

    // ---- sakura petals ---------------------------------------------------
    // A handful of tiny petals falling at very low opacity. Pure CSS transform
    // animations (fall, sway, tumble on three nested elements), so the compositor
    // runs them: no per-frame script, no canvas. Paused while a dossier is open;
    // not created at all under reduced motion.

    var petals = (function () {
      var cfg = (data.atmosphere && data.atmosphere.petals) || null;
      if (!cfg || reduce.matches) return { start: noop };
      var layer = document.createElement('div');
      layer.className = 'petals';
      layer.setAttribute('aria-hidden', 'true');
      var rand = function (a, b) { return a + Math.random() * (b - a); };

      // Petals drift a few px per second, so they are stepped at 12Hz instead of
      // animating smoothly: every duration and delay is a whole number of 1/12s
      // steps, so all animations tick on the same frames. Smooth animations on 14
      // separate layers made the browser produce a frame on every vsync.
      var STEP = 1 / 12;
      var steps = function (min, max) { return Math.max(1, Math.round(rand(min, max) / STEP)); };
      var seconds = function (n) { return (n * STEP).toFixed(4) + 's'; };

      for (var i = 0; i < (cfg.count || 14); i++) {
        var fall = document.createElement('span');
        fall.className = 'petal';
        var nFall = steps(34, 62);
        var nSway = steps(5, 9);
        var nTumble = steps(6, 12);
        fall.style.setProperty('--x', rand(0, 100).toFixed(1) + '%');
        fall.style.setProperty('--s', rand(9, 17).toFixed(1) + 'px');
        fall.style.setProperty('--fall', seconds(nFall));
        fall.style.setProperty('--fall-n', nFall);
        fall.style.setProperty('--sway', seconds(nSway));
        fall.style.setProperty('--sway-n', nSway);
        fall.style.setProperty('--tumble', seconds(nTumble));
        fall.style.setProperty('--tumble-n', nTumble);
        fall.style.setProperty('--delay', '-' + seconds(steps(0, 60)));   // spread them over the screen at start
        var sway = document.createElement('span');
        sway.className = 'petal__sway';
        var tumble = document.createElement('span');
        tumble.className = 'petal__tumble';
        sway.appendChild(tumble);
        fall.appendChild(sway);
        layer.appendChild(fall);
      }
      viewport.appendChild(layer);

      return {
        start: function () {
          // next frame, so the opacity transition actually plays
          requestAnimationFrame(function () { layer.classList.add('is-on'); });
        }
      };
    })();

    // ---- stamps slam in on first near-zoom view ---------------------------

    var stamped = {};
    var unstamped = data.cards.filter(function (c) { return c.stamps && c.stamps.length; }).length;

    function slamStamps(id) {
      var card = cardEl(id);
      if (!card) return;
      Array.prototype.forEach.call(card.querySelectorAll('.stamp'), function (stamp, i) {
        if (!stamp.animate) return;
        var rot = stamp.style.getPropertyValue('--rot');
        var pose = function (s) { return 'translate(-50%, -50%) rotate(' + rot + ') scale(' + s + ')'; };
        stamp.animate([{ transform: pose(1.6), opacity: 0 }, { transform: pose(1), opacity: 0.9 }], {
          duration: 420, delay: i * 140, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards'
        }).finished.catch(noop);
      });
    }

    function markStamped(id) {
      var c = byId(id);
      if (!c || stamped[id]) return;
      stamped[id] = true;
      if (c.stamps && c.stamps.length) unstamped--;
    }

    // camera.js calls this on every change; it exits at once unless we are at near zoom
    Camera.onChange(function (cam) {
      if (!unstamped || reduce.matches || world.getAttribute('data-zoom-level') !== 'near' ||
        body.classList.contains('intro-running')) return;
      var vw = viewport.clientWidth;
      var vh = viewport.clientHeight;
      data.cards.forEach(function (c) {
        if (stamped[c.id] || !c.stamps || !c.stamps.length) return;
        var sx = c.x * cam.k + cam.x;
        var sy = c.y * cam.k + cam.y;
        if (sx < vw * 0.08 || sx > vw * 0.92 || sy < vh * 0.08 || sy > vh * 0.92) return;
        markStamped(c.id);
        slamStamps(c.id);
      });
    });

    // ---- the intro --------------------------------------------------------

    function runIntro() {
      var anims = [];
      var timers = [];
      var done = false;
      var hero = byId('profile') || data.cards[0];
      var heroEl = cardEl(hero.id);

      function anim(node, frames, opts) {
        if (!node || !node.animate) return null;
        var a = node.animate(frames, opts);
        a.finished.catch(noop);
        anims.push(a);
        return a;
      }
      function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage blocked */ }
      body.classList.add('intro-running');

      var skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'intro-skip';
      skip.textContent = 'SKIP INTRO';
      skip.setAttribute('aria-label', 'Skip the intro animation');
      body.insertBefore(skip, body.firstChild);

      function end(skipped) {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* already gone */ } });
        if (skipped) {
          Camera.stop();
          Camera.snapFit();
        }
        body.classList.remove('intro-running');
        document.removeEventListener('keydown', onKey);
        markStamped(hero.id);
        skip.classList.add('is-leaving');
        setTimeout(function () { if (skip.parentNode) skip.parentNode.removeChild(skip); }, 450);
        petals.start();
      }

      function onKey(e) { if (e.key === 'Escape') end(true); }
      document.addEventListener('keydown', onKey);
      skip.addEventListener('click', function () { end(true); });

      // Opening shot: tight on the Subject File, placed before the first paint.
      var vw = viewport.clientWidth;
      var vh = viewport.clientHeight;
      Camera.snapTo(hero.x, hero.y, Math.min(1.6, (0.9 * vh) / hero.h, (0.9 * vw) / hero.w));

      // A card falls from above, lands, and rebounds twice.
      function dropFrames(rot) {
        var at = function (y, r, s) { return 'translateY(' + y + 'px) rotate(' + r + 'deg) scale(' + s + ')'; };
        return [
          { opacity: 0, transform: at(-340, rot - 6, 1.12), offset: 0, easing: 'cubic-bezier(.55,0,.9,.5)' },
          { opacity: 1, transform: at(-300, rot - 5, 1.1), offset: 0.08, easing: 'cubic-bezier(.55,0,.9,.5)' },
          { opacity: 1, transform: at(0, rot, 1), offset: 0.5, easing: 'cubic-bezier(.2,.6,.4,1)' },
          { opacity: 1, transform: at(-26, rot, 1.01), offset: 0.68, easing: 'cubic-bezier(.55,0,.9,.5)' },
          { opacity: 1, transform: at(0, rot, 1), offset: 0.84, easing: 'cubic-bezier(.2,.6,.4,1)' },
          { opacity: 1, transform: at(-5, rot, 1), offset: 0.93, easing: 'cubic-bezier(.55,0,.9,.5)' },
          { opacity: 1, transform: at(0, rot, 1), offset: 1 }
        ];
      }

      // 1. the Subject File lands, then its stamp slams down with a shake
      anim(heroEl, dropFrames(hero.rot), { duration: T.heroDropMs, delay: T.heroDrop, fill: 'both' });
      var heroStamp = heroEl.querySelector('.stamp');
      if (heroStamp) {
        var sr = heroStamp.style.getPropertyValue('--rot');
        var pose = function (s, extra) { return 'translate(-50%, -50%) rotate(calc(' + sr + ' + ' + extra + 'deg)) scale(' + s + ')'; };
        anim(heroStamp, [
          { transform: pose(2.8, -14), opacity: 0, offset: 0, easing: 'cubic-bezier(.6,0,.9,.4)' },
          { transform: pose(1, 0), opacity: 0.9, offset: 0.6 },
          { transform: pose(0.94, 0), opacity: 0.9, offset: 0.78 },
          { transform: pose(1, 0), opacity: 0.9, offset: 1 }
        ], { duration: T.slamMs, delay: T.slam, fill: 'both' });
      }
      var shakeAt = function (x, y) { return 'translate(' + x + 'px,' + y + 'px) rotate(' + hero.rot + 'deg)'; };
      anim(heroEl, [
        { transform: shakeAt(0, 0) }, { transform: shakeAt(-8, 5) }, { transform: shakeAt(7, -6) },
        { transform: shakeAt(-4, 3) }, { transform: shakeAt(3, -2) }, { transform: shakeAt(0, 0) }
      ], { duration: 380, delay: T.slam + 250, easing: 'ease-out' });

      // 2. the camera pulls back to the full board
      var cameraDone = new Promise(function (resolve) {
        later(T.pull, function () { Camera.fitAll({ duration: T.pullMs }).then(resolve); });
      });

      // 3. the other cards drop in, one after another
      data.cards.filter(function (c) { return c !== hero; }).forEach(function (c, i) {
        anim(cardEl(c.id), dropFrames(c.rot), { duration: T.cardMs, delay: T.cards + i * T.cardStagger, fill: 'both' });
      });

      // 4. strings draw in one by one (stroke-dashoffset; every path has pathLength 1000)
      Array.prototype.forEach.call(world.querySelectorAll('.string'), function (g, i) {
        Array.prototype.forEach.call(g.querySelectorAll('path:not(.string__pulse)'), function (path) {
          anim(path, [{ strokeDashoffset: 1000 }, { strokeDashoffset: 0 }], {
            duration: T.stringMs, delay: T.strings + i * T.stringStagger, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both'
          });
        });
      });

      // 5. the rising sun glows up, then the wall stamps land
      anim(world.querySelector('.sun'), [{ opacity: 0 }, { opacity: 1 }], { duration: T.sunMs, delay: T.sun, fill: 'both' });
      Array.prototype.forEach.call(world.querySelectorAll('.stamp--board'), function (stamp, i) {
        var r = stamp.style.getPropertyValue('--rot');
        var p = function (s) { return 'translate(-50%, -50%) rotate(' + r + ') scale(' + s + ')'; };
        anim(stamp, [{ transform: p(1.7), opacity: 0 }, { transform: p(1), opacity: 0.55 }], {
          duration: T.boardStampMs, delay: T.boardStamps + i * T.boardStampStagger,
          easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both'
        });
      });

      // the board is revealed already set up: from here the intro plays itself out
      html.classList.remove('intro-pending');

      Promise.all(anims.map(function (a) { return a.finished.catch(noop); }).concat(cameraDone)).then(function () { end(false); });
    }

    // ---- go ----------------------------------------------------------------

    if (html.classList.contains('intro-pending')) {
      try {
        runIntro();
      } catch (err) {
        html.classList.remove('intro-pending');
        body.classList.remove('intro-running');
        petals.start();
      }
    } else {
      petals.start();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*! MVAnim (monovanilla-anim.js) - ES5 animation helpers, WAAPI with rAF fallback. Chrome 38+. */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.MVAnim = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var win = typeof window !== 'undefined' ? window : {};

  var raf = win.requestAnimationFrame ||
            win.webkitRequestAnimationFrame ||
            win.mozRequestAnimationFrame ||
            function (cb) { return setTimeout(function () { cb(_now()); }, 16); };

  var caf = win.cancelAnimationFrame ||
            win.webkitCancelAnimationFrame ||
            win.mozCancelAnimationFrame ||
            clearTimeout;

  function _now() {
    return (win.performance && win.performance.now) ? win.performance.now() : Date.now();
  }

  function reduced() {
    try {
      return !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function hasAnimate() {
    return typeof Element !== 'undefined' &&
           Element.prototype &&
           typeof Element.prototype.animate === 'function';
  }

  var EASE_SWIFT = 'cubic-bezier(.16, 1, .3, 1)';
  var EASE_SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';

  function _tween(duration, onFrame, onDone) {
    var start = _now();
    var id;
    function step() {
      var p = (duration > 0) ? Math.min(1, (_now() - start) / duration) : 1;
      onFrame(p);
      if (p < 1) {
        id = raf(step);
      } else if (onDone) {
        onDone();
      }
    }
    id = raf(step);
    return {
      cancel: function () { caf(id); }
    };
  }

  function expand(el, duration, easing) {
    if (!el) { return null; }
    duration = duration == null ? 320 : duration;
    easing = easing || EASE_SWIFT;

    if (reduced()) {
      el.style.height = 'auto';
      el.style.opacity = '1';
      el.style.overflow = '';
      return null;
    }

    var target = el.scrollHeight;

    if (hasAnimate()) {
      el.style.overflow = 'hidden';
      var a = el.animate(
        [{ height: '0px', opacity: 0 }, { height: target + 'px', opacity: 1 }],
        { duration: duration, easing: easing }
      );
      a.onfinish = function () {
        el.style.height = 'auto';
        el.style.overflow = '';
        el.style.opacity = '1';
      };
      return a;
    }

    el.style.height = '0px';
    el.style.opacity = '0';
    el.style.overflow = 'hidden';
    return _tween(duration, function (p) {
      el.style.height = (target * p) + 'px';
      el.style.opacity = String(p);
    }, function () {
      el.style.height = 'auto';
      el.style.opacity = '1';
      el.style.overflow = '';
    });
  }

  function collapse(el, duration, easing) {
    if (!el) { return null; }
    duration = duration == null ? 320 : duration;
    easing = easing || EASE_SWIFT;

    if (reduced()) {
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.overflow = 'hidden';
      return null;
    }

    var start = el.offsetHeight;

    if (hasAnimate()) {
      el.style.overflow = 'hidden';
      var a = el.animate(
        [{ height: start + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: duration, easing: easing }
      );
      a.onfinish = function () {
        el.style.height = '0px';
        el.style.overflow = 'hidden';
        el.style.opacity = '0';
      };
      return a;
    }

    el.style.height = start + 'px';
    el.style.opacity = '1';
    el.style.overflow = 'hidden';
    return _tween(duration, function (p) {
      el.style.height = (start * (1 - p)) + 'px';
      el.style.opacity = String(1 - p);
    }, function () {
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.overflow = 'hidden';
    });
  }

  function toggle(el, duration, easing) {
    if (!el) { return null; }
    var open = el.offsetHeight > 0 && el.getAttribute('data-mv-open') !== 'false';
    if (el.getAttribute('data-mv-open') === 'true') { open = true; }
    if (open) {
      el.setAttribute('data-mv-open', 'false');
      return collapse(el, duration, easing);
    }
    el.setAttribute('data-mv-open', 'true');
    return expand(el, duration, easing);
  }

  function stagger(container, step, capMs) {
    if (!container || !container.children) { return; }
    step = step == null ? 30 : step;
    capMs = capMs == null ? 400 : capMs;
    var kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      var d = Math.min(i * step, capMs);
      kids[i].style.animationDelay = d + 'ms';
      kids[i].style.webkitAnimationDelay = d + 'ms';
    }
  }

  function enter(el, delay, lite) {
    if (!el || !el.classList) { return; }
    delay = delay == null ? 0 : delay;
    el.classList.remove('mv-enter-active');
    el.classList.add(lite ? 'mv-enter-lite' : 'mv-enter');
    if (lite) { el.classList.remove('mv-enter'); } else { el.classList.remove('mv-enter-lite'); }
    function go() {
      if (reduced()) {
        el.classList.remove('mv-enter');
        el.classList.remove('mv-enter-lite');
        el.classList.add('mv-enter-active');
        return;
      }
      raf(function () { el.classList.add('mv-enter-active'); });
    }
    if (delay > 0) { setTimeout(go, delay); } else { go(); }
  }

  function enterAll(container, step, baseDelay, lite) {
    if (!container || !container.children) { return; }
    step = step == null ? 60 : step;
    baseDelay = baseDelay || 0;
    var kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      enter(kids[i], baseDelay + i * step, lite);
    }
  }

  function fadeBlur(el, show, duration, blurPx) {
    if (!el) { return null; }
    duration = duration == null ? (show ? 400 : 350) : duration;
    var b = blurPx == null ? 12 : blurPx;
    var fromO = show ? 0 : 1;
    var toO = show ? 1 : 0;
    var fromB = show ? b : 0;
    var toB = show ? 0 : b;

    if (reduced()) {
      el.style.opacity = String(toO);
      el.style.webkitFilter = 'blur(' + toB + 'px)';
      el.style.filter = 'blur(' + toB + 'px)';
      return null;
    }
    if (hasAnimate()) {
      var fa = el.animate(
        [{ opacity: fromO, filter: 'blur(' + fromB + 'px)' }, { opacity: toO, filter: 'blur(' + toB + 'px)' }],
        { duration: duration, easing: EASE_SWIFT }
      );
      fa.onfinish = function () {
        el.style.opacity = String(toO);
        el.style.webkitFilter = 'blur(' + toB + 'px)';
        el.style.filter = 'blur(' + toB + 'px)';
      };
      return fa;
    }
    return _tween(duration, function (p) {
      var o = fromO + (toO - fromO) * p;
      var bv = fromB + (toB - fromB) * p;
      el.style.opacity = String(o);
      el.style.webkitFilter = 'blur(' + bv + 'px)';
      el.style.filter = 'blur(' + bv + 'px)';
    }, function () {
      el.style.opacity = String(toO);
      el.style.webkitFilter = 'blur(' + toB + 'px)';
      el.style.filter = 'blur(' + toB + 'px)';
    });
  }

  function _num(el, prop, to, duration) {
    var map = { width: 'offsetWidth', height: 'offsetHeight', left: 'offsetLeft', x: null };
    var from = prop === 'x' ? 0 : (el[map[prop]] || 0);
    var unit = (prop === 'x' || prop === 'left' || prop === 'width' || prop === 'height') ? 'px' : '';
    function apply(v) {
      if (prop === 'x') {
        el.style.webkitTransform = 'translateX(' + v + 'px)';
        el.style.transform = 'translateX(' + v + 'px)';
      } else {
        el.style[prop] = v + unit;
      }
    }
    if (reduced() || !hasAnimate()) {
      return _tween(duration || 300, function (p) { apply(from + (to - from) * p); }, function () { apply(to); });
    }
    var frames;
    if (prop === 'x') {
      frames = [{ transform: 'translateX(' + from + 'px)' }, { transform: 'translateX(' + to + 'px)' }];
    } else {
      var o = {}; o[prop] = from + unit; var t = {}; t[prop] = to + unit;
      frames = [o, t];
    }
    var numAnim = el.animate(frames, { duration: duration || 300, easing: EASE_SWIFT });
    numAnim.onfinish = function () { apply(to); };
    return numAnim;
  }

  function animateWidth(el, to, duration) { return _num(el, 'width', to, duration); }
  function slideTo(el, left, width, duration) {
    if (!el) { return null; }
    if (reduced() || !hasAnimate()) {
      el.style.left = left + 'px';
      el.style.width = width + 'px';
      return null;
    }
    var slideAnim = el.animate(
      [{ left: el.offsetLeft + 'px', width: el.offsetWidth + 'px' }, { left: left + 'px', width: width + 'px' }],
      { duration: duration || 280, easing: 'cubic-bezier(.25, 1, .5, 1)' }
    );
    slideAnim.onfinish = function () {
      el.style.left = left + 'px';
      el.style.width = width + 'px';
    };
    return slideAnim;
  }
  function translateX(el, x, duration) { return _num(el, 'x', x, duration); }

  function reveal(el, open) {
    if (!el || !el.classList) { return; }
    if (open) { el.classList.add('mv-reveal-open'); }
    else { el.classList.remove('mv-reveal-open'); }
  }

  function replay(el, className) {
    if (!el) { return; }
    var cls = className || 'animate-row-fade';
    if (el.classList) {
      el.classList.remove(cls);
    } else {
      el.className = el.className.replace(new RegExp('(^|\\s)' + cls + '(\\s|$)', 'g'), ' ');
    }

    el.offsetWidth;
    if (el.classList) {
      el.classList.add(cls);
    } else if (el.className.indexOf(cls) === -1) {
      el.className += ' ' + cls;
    }
  }

  function _addClass(el, c) {
    if (el.classList) { el.classList.add(c); }
    else if (el.className.indexOf(c) === -1) { el.className += ' ' + c; }
  }
  function _removeClass(el, c) {
    if (el.classList) { el.classList.remove(c); }
    else {
      var parts = el.className.split(/\s+/);
      var next = '';
      for (var i = 0; i < parts.length; i++) {
        if (parts[i] && parts[i] !== c) { next += (next ? ' ' : '') + parts[i]; }
      }
      el.className = next;
    }
  }

  function _watchTransition(el, cb, timeoutMs) {
    var done = false;
    function fin() {
      if (done) { return; }
      done = true;
      if (el.removeEventListener) { el.removeEventListener('transitionend', onEnd, false); }
      cb();
    }
    function onEnd(e) {
      if (e.target === el) { fin(); }
    }
    if (el.addEventListener) { el.addEventListener('transitionend', onEnd, false); }
    setTimeout(fin, timeoutMs || 500);
  }

  var _OVERLAY_STATE = {
    'dialog-pop': {
      from: { opacity: '0', filter: 'blur(16px)', transform: 'scale(0.92)' },
      to: { opacity: '0', filter: 'blur(16px)', transform: 'scale(0.92)' }
    },
    'dialog-mask': { from: { opacity: '0' }, to: { opacity: '0' } },
    'drawer-mask': { from: { opacity: '0' }, to: { opacity: '0' } },
    'drawer-right': {
      from: { transform: 'translate(100%)', boxShadow: '0 20px 60px rgba(0,0,0,0)' },
      to: { transform: 'translate(100%)', boxShadow: '0 20px 60px rgba(0,0,0,0)' }
    },
    'drawer-left': {
      from: { transform: 'translate(-100%)', boxShadow: '0 20px 60px rgba(0,0,0,0)' },
      to: { transform: 'translate(-100%)', boxShadow: '0 20px 60px rgba(0,0,0,0)' }
    },
    'drawer-top': {
      from: { transform: 'translateY(-100%)', boxShadow: '0 20px 60px rgba(0,0,0,0)' },
      to: { transform: 'translateY(-100%)', boxShadow: '0 20px 60px rgba(0,0,0,0)' }
    },
    'drawer-bottom': {
      from: { transform: 'translateY(100%)', boxShadow: '0 20px 60px rgba(0,0,0,0)' },
      to: { transform: 'translateY(100%)', boxShadow: '0 20px 60px rgba(0,0,0,0)' }
    },
    'dropdown': {
      from: { opacity: '0', filter: 'blur(16px)', transform: 'scale(0)', transformOrigin: '0 0' },
      to: { opacity: '0', filter: 'blur(16px)', transform: 'scale(0)', transformOrigin: '0 0' }
    },
    'alert-expand': {
      from: { opacity: '0', maxHeight: '0', transform: 'translateY(-4px)' },
      to: { opacity: '0', maxHeight: '0', transform: 'translateY(-4px)' }
    },
    'alert-icon-pop': {
      dur: 300, ease: EASE_SPRING,
      from: { opacity: '0', transform: 'scale(0.4)' },
      to: { opacity: '0', transform: 'scale(0.4)' }
    },
    'backtop-fade': {
      from: { opacity: '0', filter: 'blur(12px)' },
      to: { opacity: '0', filter: 'blur(12px)' }
    },
    'message-flip': {
      from: { opacity: '0', filter: 'blur(15px)', transform: 'translateY(-20px) scale(0.5)' },
      to: { opacity: '0', filter: 'blur(10px)', transform: 'translateY(-15px) scale(0)' }
    },
    'notif-flip-right': {
      from: { opacity: '0', filter: 'blur(8px)', transform: 'translate(40px) scale(0.95)' },
      to: { opacity: '0', filter: 'blur(4px)', transform: 'translate(20px) scale(0.95)' }
    },
    'notif-flip-left': {
      from: { opacity: '0', filter: 'blur(8px)', transform: 'translate(-40px) scale(0.95)' },
      to: { opacity: '0', filter: 'blur(4px)', transform: 'translate(-20px) scale(0.95)' }
    },
    'notif-flip-top': {
      from: { opacity: '0', filter: 'blur(8px)', transform: 'translateY(-40px) scale(0.95)' },
      to: { opacity: '0', filter: 'blur(4px)', transform: 'translateY(-20px) scale(0.95)' }
    },
    'notif-flip-bottom': {
      from: { opacity: '0', filter: 'blur(8px)', transform: 'translateY(40px) scale(0.95)' },
      to: { opacity: '0', filter: 'blur(4px)', transform: 'translateY(20px) scale(0.95)' }
    }
  };

  function _applyState(el, state) {
    if (!el || !state) { return; }
    for (var k in state) {
      if (!state.hasOwnProperty(k)) { continue; }
      el.style[k] = state[k];
      if (k === 'transform') { el.style.webkitTransform = state[k]; }
      if (k === 'filter') { el.style.webkitFilter = state[k]; }
    }
  }
  function _clearState(el, state) {
    if (!el || !state) { return; }
    for (var k in state) {
      if (!state.hasOwnProperty(k)) { continue; }
      el.style[k] = '';
      if (k === 'transform') { el.style.webkitTransform = ''; }
      if (k === 'filter') { el.style.webkitFilter = ''; }
    }
  }

  function _reflowAll(el) {
    try {
      if (typeof document !== 'undefined' && document.body) { document.body.offsetWidth; }
    } catch (e) {
 }
    el.offsetWidth;
  }

  function _kf(state) {
    if (!state) { return {}; }
    var out = {};
    for (var k in state) {
      if (state.hasOwnProperty(k)) {
        out[k] = state[k];
      }
    }
    return out;
  }

  function _isFlip(name) {
    return name === 'message-flip' || name.indexOf('notif-flip-') === 0;
  }

  function _normHooks(hooks) {
    if (typeof hooks === 'function') { return { before: null, after: hooks }; }
    hooks = hooks || {};
    return {
      before: hooks.beforeEnter || hooks.beforeLeave || null,
      after: hooks.afterEnter || hooks.afterLeave || null
    };
  }

  function overlayEnter(el, name, hooks) {
    if (!el || !name) { return; }
    var st = _OVERLAY_STATE[name];
    var dur = (st && st.dur) || 400;
    var ease = (st && st.ease) || EASE_SWIFT;
    var gen = (el.__mvGen = (el.__mvGen || 0) + 1);
    var H = _normHooks(hooks);
    el.__mvLeaving = false;
    if (el.__mvAnim) {
      try { el.__mvAnim.cancel(); } catch (e2) {
  }
      el.__mvAnim = null;
    }
    _removeClass(el, name + '-leave-active');
    _removeClass(el, name + '-leave-to');
    _clearState(el, st ? st.to : null);

    if (H.before) { H.before(el); }

    if (reduced()) {
      _clearState(el, st ? st.from : null);
      _removeClass(el, name + '-enter-active');
      _removeClass(el, name + '-enter-from');
      if (H.after) { H.after(el); }
      return;
    }

    if (hasAnimate() && el.animate && st && !_isFlip(name)) {
      _addClass(el, name + '-enter-active');
      var a = el.animate([_kf(st.from), {}], { duration: dur, easing: ease });
      el.__mvAnim = a;
      a.onfinish = function () {
        _removeClass(el, name + '-enter-active');
        _removeClass(el, name + '-enter-from');
        if (el.__mvAnim === a) { el.__mvAnim = null; }
        if (H.after) { H.after(el); }
      };
      return;
    }

    _addClass(el, name + '-enter-from');
    _reflowAll(el);
    _addClass(el, name + '-enter-active');
    raf(function () {
      if (el.__mvGen !== gen) { return; }
      _removeClass(el, name + '-enter-from');
    });
    setTimeout(function () {
      if (el.__mvGen !== gen) { return; }
      _removeClass(el, name + '-enter-active');
      if (H.after) { H.after(el); }
    }, dur + 40);
  }

  function overlayLeave(el, name, hooks) {
    var H = _normHooks(hooks);
    if (!el || !name) { if (H.after) { H.after(el); } return; }
    var st = _OVERLAY_STATE[name];
    var dur = (st && st.dur) || 400;
    var ease = (st && st.ease) || EASE_SWIFT;
    var gen = (el.__mvGen = (el.__mvGen || 0) + 1);
    el.__mvLeaving = true;
    if (el.__mvAnim) {
      try { el.__mvAnim.cancel(); } catch (e2) {
  }
      el.__mvAnim = null;
    }
    _removeClass(el, name + '-enter-active');
    _removeClass(el, name + '-enter-from');
    _clearState(el, st ? st.from : null);

    if (H.before) { H.before(el); }

    if (reduced()) {
      el.__mvLeaving = false;
      _removeClass(el, name + '-leave-active');
      _removeClass(el, name + '-leave-to');
      _clearState(el, st ? st.to : null);
      if (H.after) { H.after(el); }
      return;
    }

    _addClass(el, name + '-leave-active');

    function finish() {
      if (!el.__mvLeaving) { return; }
      el.__mvLeaving = false;
      _removeClass(el, name + '-leave-active');
      _removeClass(el, name + '-leave-to');
      _clearState(el, st ? st.to : null);
      if (H.after) { H.after(el); }
    }

    if (hasAnimate() && el.animate && st && !_isFlip(name)) {
      var a = el.animate([{}, _kf(st.to)], { duration: dur, easing: ease });
      el.__mvAnim = a;
      a.onfinish = function () {
        if (el.__mvAnim === a) { el.__mvAnim = null; }
        finish();
      };
      setTimeout(function () {
        if (el.__mvAnim === a) {
          try { a.cancel(); } catch (e2) {
  }
          el.__mvAnim = null;
          finish();
        }
      }, dur + 60);
      return;
    }

    _addClass(el, name + '-leave-to');
    _reflowAll(el);
    setTimeout(function () {
      if (el.__mvGen !== gen) { return; }
      finish();
    }, dur + 40);
  }

  function overlayOpen(mask, panel, wrap, name) {
    if (!panel || !name) { return; }
    panel.__mvLeaving = false;
    if (wrap) { wrap.hidden = false; wrap.style.display = ''; wrap.style.pointerEvents = ''; }
    if (mask) { mask.hidden = false; mask.style.display = ''; }
    panel.hidden = false;
    panel.style.display = '';
    _removeClass(panel, name + '-leave-active');
    _removeClass(panel, name + '-leave-to');
    overlayEnter(mask, 'dialog-mask');
    overlayEnter(panel, name);
  }

  function overlayClose(mask, panel, wrap, name, onDone) {
    if (!panel || !name) { if (onDone) { onDone(); } return; }
    if (panel.__mvLeaving) { return; }
    if (wrap) { wrap.style.pointerEvents = 'none'; }
    overlayLeave(panel, name, function () {
      panel.hidden = true;
      panel.style.display = 'none';
      if (wrap) { wrap.hidden = true; wrap.style.display = 'none'; }
      if (onDone) { onDone(); }
    });
    overlayLeave(mask, 'dialog-mask', function () {
      if (mask) { mask.hidden = true; mask.style.display = 'none'; }
    });
  }

  function transition(el, name, hooks) {
    hooks = hooks || {};
    function noop() {}
    if (!el || !name) { return { enter: noop, leave: noop }; }
    var st = _OVERLAY_STATE[name];
    var dur = hooks.duration != null ? hooks.duration : ((st && st.dur) || 400);
    function fire(cb, target) { if (typeof cb === 'function') { cb(target); } }
    var entered = false;
    var leaving = false;
    function enter() {
      if (entered) { return; }
      entered = true;
      fire(hooks.beforeEnter, el);
      if (reduced()) { fire(hooks.afterEnter, el); return; }
      if (hooks.enter) {
        var done = false;
        var timer = setTimeout(function () {
          if (done) { return; }
          done = true;
          fire(hooks.afterEnter, el);
        }, dur + 40);
        hooks.enter(el, function () {
          if (done) { return; }
          done = true;
          clearTimeout(timer);
          fire(hooks.afterEnter, el);
        });
      } else {
        overlayEnter(el, name, { afterEnter: function (target) { fire(hooks.afterEnter, target); } });
      }
    }
    function leave() {
      if (leaving) { return; }
      leaving = true;
      fire(hooks.beforeLeave, el);
      if (reduced()) { fire(hooks.afterLeave, el); return; }
      if (hooks.leave) {
        var done = false;
        var timer = setTimeout(function () {
          if (done) { return; }
          done = true;
          fire(hooks.afterLeave, el);
        }, dur + 40);
        hooks.leave(el, function () {
          if (done) { return; }
          done = true;
          clearTimeout(timer);
          fire(hooks.afterLeave, el);
        });
      } else {
        overlayLeave(el, name, { afterLeave: function (target) { fire(hooks.afterLeave, target); } });
      }
    }
    return { enter: enter, leave: leave, setDuration: function (d) { dur = d; } };
  }

  var _overlayStack = [];
  var _ovKeyBound = false;
  var _OV_Z_BASE = 9000;
  var _OV_Z_STEP = 10;

  function _ovFocusable(root) {
    var sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    var els = [];
    try { els = root.querySelectorAll(sel); } catch (e) { els = []; }
    var out = [];
    for (var i = 0; i < els.length; i++) { out.push(els[i]); }
    return out;
  }
  function _ovTop() { return _overlayStack.length ? _overlayStack[_overlayStack.length - 1] : null; }
  function _ovBindKey() {
    if (_ovKeyBound) { return; }
    document.addEventListener('keydown', _ovOnKey, true);
    _ovKeyBound = true;
  }
  function _ovUnbindKey() {
    if (!_ovKeyBound) { return; }
    document.removeEventListener('keydown', _ovOnKey, true);
    _ovKeyBound = false;
  }
  function _ovOnKey(e) {
    var top = _ovTop();
    if (!top) { return; }
    var key = e.key != null ? e.key : (e.keyCode === 27 ? 'Escape' : (e.keyCode === 9 ? 'Tab' : ''));
    if (e.keyCode === 27 || key === 'Escape') {
      if (top.opts && top.opts.onEsc === false) { return; }
      e.preventDefault();
      closeOverlay(top.mask, top.panel, top.wrap, top.name, top.opts);
      return;
    }
    if (e.keyCode === 9 || key === 'Tab') {
      if (!top.panel) { return; }
      var f = _ovFocusable(top.panel);
      if (!f.length) { return; }
      var first = f[0], last = f[f.length - 1];
      var active = document.activeElement;
      var outside = !active || !top.panel.contains(active);
      if (e.shiftKey) {
        if (active === first || outside) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last || outside) { e.preventDefault(); first.focus(); }
      }
    }
  }
  function openOverlay(mask, panel, wrap, name, opts) {
    opts = opts || {};
    if (!panel || !name) { return null; }
    for (var i = 0; i < _overlayStack.length; i++) {
      if (_overlayStack[i].panel === panel) { return _overlayStack[i]; }
    }
    var entry = { mask: mask, panel: panel, wrap: wrap, name: name, opts: opts, lastFocus: document.activeElement, z: 0 };
    _overlayStack.push(entry);
    entry.z = _OV_Z_BASE + _overlayStack.length * _OV_Z_STEP;
    if (mask) { mask.style.zIndex = entry.z; }
    if (wrap) { wrap.style.zIndex = entry.z + 1; }
    panel.style.zIndex = entry.z + 1;
    _ovBindKey();
    overlayOpen(mask, panel, wrap, name);
    if (opts.focus !== false) {
      var f = _ovFocusable(panel);
      var target = (panel.tabIndex != null && panel.tabIndex >= 0) ? panel : (f.length ? f[0] : null);
      if (target) { setTimeout(function () { try { target.focus(); } catch (e2) { } }, 0); }
    }
    return entry;
  }
  function closeOverlay(mask, panel, wrap, name, opts) {
    opts = opts || {};
    var idx = -1;
    for (var i = 0; i < _overlayStack.length; i++) {
      if (_overlayStack[i].panel === panel) { idx = i; break; }
    }
    if (idx === -1) {
      overlayClose(mask, panel, wrap, name, opts.onClosed || null);
      return;
    }
    var entry = _overlayStack[idx];
    _overlayStack.splice(idx, 1);
    var restore = entry.lastFocus;
    overlayClose(mask, panel, wrap, name, function () {
      if (restore && restore.focus && restore.parentNode) { try { restore.focus(); } catch (e2) { } }
      if (opts.onClosed) { opts.onClosed(); }
      if (!_overlayStack.length) { _ovUnbindKey(); }
    });
  }

  var _msgStack = null;
  var _notifStacks = {};

  function _ensureMsgStack() {
    if (!_msgStack) {
      _msgStack = document.createElement('div');
      _msgStack.className = 'mv-message-stack';
      document.body.appendChild(_msgStack);
    }
    return _msgStack;
  }
  function _ensureNotifStack(side) {
    if (!_notifStacks[side]) {
      var st = document.createElement('div');
      st.className = 'mv-notif-stack';
      st.setAttribute('data-side', side);
      document.body.appendChild(st);
      _notifStacks[side] = st;
    }
    return _notifStacks[side];
  }

  function _flipPre(stack) {
    var out = [];
    var kids = stack.children;
    for (var i = 0; i < kids.length; i++) {
      out.push({ el: kids[i], old: kids[i].getBoundingClientRect() });
    }
    return out;
  }

  function _flipPost(stack, name, data) {
    var moveClass = name + '-move';
    var moved = [];
    for (var i = 0; i < data.length; i++) {
      var el = data[i].el;
      if (!el.parentNode) { continue; }
      if (el.__mvLeaving) { continue; }
      var cls = el.className || '';
      if (cls.indexOf(moveClass) !== -1) { continue; }
      if (cls.indexOf(name + '-enter-active') !== -1) { continue; }
      var oldR = data[i].old;
      var newR = el.getBoundingClientRect();
      var dx = oldR.left - newR.left;
      var dy = oldR.top - newR.top;
      if (dx === 0 && dy === 0) { continue; }
      el.style.transition = 'none';
      el.style.webkitTransition = 'none';
      el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      el.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
      moved.push(el);
    }
    if (!moved.length) { return; }
    document.body.offsetHeight;
    raf(function () {
      for (var j = 0; j < moved.length; j++) {
        var m = moved[j];
        _addClass(m, moveClass);
        m.style.transition = '';
        m.style.webkitTransition = '';
        m.style.transform = '';
        m.style.webkitTransform = '';
      }
      setTimeout(function () {
        for (var k = 0; k < moved.length; k++) { _removeClass(moved[k], moveClass); }
      }, 440);
    });
  }

  function _flipDismiss(stack, el, name, onDone) {
    var pre = _flipPre(stack);
    overlayLeave(el, name, function () {
      if (el.parentNode) { el.parentNode.removeChild(el); }
      if (onDone) { onDone(); }
    });
    _flipPost(stack, name, pre);
  }

  function flipPre(container) {
    var out = [];
    var kids = container ? container.children : null;
    for (var i = 0; kids && i < kids.length; i++) {
      out.push({ el: kids[i], old: kids[i].getBoundingClientRect() });
    }
    return out;
  }

  function flipPost(container, snapshot, opts) {
    opts = opts || {};
    if (!snapshot || reduced()) { return; }
    var dur = opts.duration != null ? opts.duration : 400;
    var ease = opts.easing || EASE_SWIFT;
    var moved = [];
    for (var i = 0; i < snapshot.length; i++) {
      var el = snapshot[i].el;
      if (!el.parentNode) { continue; }
      var oldR = snapshot[i].old;
      var newR = el.getBoundingClientRect();
      var dx = oldR.left - newR.left;
      var dy = oldR.top - newR.top;
      if (dx === 0 && dy === 0) { continue; }
      el.style.transition = 'none';
      el.style.webkitTransition = 'none';
      el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      el.style.webkitTransform = 'translate(' + dx + 'px, ' + dy + 'px)';
      moved.push(el);
    }
    if (!moved.length) { return; }
    if (container && container.offsetHeight != null) { container.offsetHeight; } else { document.body.offsetHeight; }
    raf(function () {
      for (var j = 0; j < moved.length; j++) {
        var m = moved[j];
        m.style.transition = 'transform ' + dur + 'ms ' + ease;
        m.style.webkitTransition = '-webkit-transform ' + dur + 'ms ' + ease;
        m.style.transform = '';
        m.style.webkitTransform = '';
        (function (target, d) {
          setTimeout(function () {
            target.style.transition = '';
            target.style.webkitTransition = '';
          }, d + 40);
        })(m, dur);
      }
    });
  }

  function flipGroup(container, mutate, opts) {
    if (!container) { return; }
    if (reduced()) {
      if (typeof mutate === 'function') { mutate(container); }
      return;
    }
    var pre = flipPre(container);
    if (typeof mutate === 'function') { mutate(container); }
    flipPost(container, pre, opts);
  }

  var _SVG_NS = 'http://www.w3.org/2000/svg';
  var _ICON_PATHS = {
    info: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'M12 16v-4' }],
      ['path', { d: 'M12 8h.01' }]
    ],
    success: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'm9 12 2 2 4-4' }]
    ],
    error: [
      ['circle', { cx: '12', cy: '12', r: '10' }],
      ['path', { d: 'm15 9-6 6' }],
      ['path', { d: 'm9 9 6 6' }]
    ],
    warning: [
      ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
      ['path', { d: 'M12 9v4' }],
      ['path', { d: 'M12 17h.01' }]
    ],
    close: [
      ['path', { d: 'M18 6 6 18' }],
      ['path', { d: 'm6 6 12 12' }]
    ]
  };

  function _svg(name, cls) {
    var svg = document.createElementNS(_SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    if (cls) { svg.setAttribute('class', cls); }
    var list = _ICON_PATHS[name] || _ICON_PATHS.info;
    for (var i = 0; i < list.length; i++) {
      var node = document.createElementNS(_SVG_NS, list[i][0]);
      var attrs = list[i][1];
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) { node.setAttribute(k, attrs[k]); }
      }
      svg.appendChild(node);
    }
    return svg;
  }

  function message(opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var text = opts.text != null ? opts.text : (opts.content || '');
    var duration = opts.duration == null ? 3000 : opts.duration;
    var stack = _ensureMsgStack();
    var el = document.createElement('div');
    el.className = 'mv-message';
    el.setAttribute('data-type', type);
    el.appendChild(_svg(type, 'mv-msg-icon'));
    var label = document.createElement('span');
    label.className = 'mv-msg-text';
    label.appendChild(document.createTextNode(text));
    el.appendChild(label);
    var dismissed = false;
    function dismiss() {
      if (dismissed) { return; }
      dismissed = true;
      _flipDismiss(stack, el, 'message-flip', function () {
        if (opts.onRemove) { opts.onRemove(); }
      });
    }
    if (opts.closable) {
      var closeBtn = document.createElement('button');
      closeBtn.className = 'mv-msg-close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', '关闭');
      closeBtn.appendChild(_svg('close'));
      closeBtn.onclick = dismiss;
      el.appendChild(closeBtn);
    }
    var pre = _flipPre(stack);
    stack.appendChild(el);
    _flipPost(stack, 'message-flip', pre);
    overlayEnter(el, 'message-flip');
    if (duration > 0) { setTimeout(dismiss, duration); }
    return el;
  }

  function notification(opts) {
    opts = opts || {};
    var side = opts.side || 'right';
    var type = opts.type || 'info';
    var title = opts.title || '';
    var text = opts.text != null ? opts.text : (opts.message || '');
    var duration = opts.duration == null ? 5000 : opts.duration;
    var stack = _ensureNotifStack(side);
    var el = document.createElement('div');
    el.className = 'mv-notif';
    el.setAttribute('data-type', type);
    var row = document.createElement('div');
    row.className = 'mv-notif-row';
    var iw = document.createElement('div');
    iw.className = 'mv-notif-iconwrap';
    iw.appendChild(_svg(type, 'mv-notif-icon'));
    row.appendChild(iw);
    var body = document.createElement('div');
    body.className = 'mv-notif-body';
    if (title) {
      var h = document.createElement('h3');
      h.className = 'mv-notif-title';
      h.appendChild(document.createTextNode(title));
      body.appendChild(h);
    }
    if (text) {
      var p = document.createElement('p');
      p.className = 'mv-notif-text';
      p.appendChild(document.createTextNode(text));
      body.appendChild(p);
    }
    row.appendChild(body);
    var dismissed = false;
    function dismiss() {
      if (dismissed) { return; }
      dismissed = true;
      _flipDismiss(stack, el, 'notif-flip-' + side, function () {
        if (opts.onRemove) { opts.onRemove(); }
      });
    }
    if (opts.closable !== false) {
      var cb = document.createElement('button');
      cb.className = 'mv-notif-close';
      cb.type = 'button';
      cb.setAttribute('aria-label', '关闭');
      cb.appendChild(_svg('close'));
      cb.onclick = dismiss;
      row.appendChild(cb);
    }
    el.appendChild(row);
    if (duration > 0 && !reduced()) {
      var timer = document.createElement('div');
      timer.className = 'mv-notif-timer';
      var bar = document.createElement('span');
      bar.className = 'mv-notif-timer-bar';
      bar.style.webkitAnimationDuration = duration + 'ms';
      bar.style.animationDuration = duration + 'ms';
      timer.appendChild(bar);
      el.appendChild(timer);
    }
    var preN = _flipPre(stack);
    stack.appendChild(el);
    _flipPost(stack, 'notif-flip-' + side, preN);
    overlayEnter(el, 'notif-flip-' + side);
    if (duration > 0) { setTimeout(dismiss, duration); }
    return el;
  }

  function closeAllMessages() {
    var stack = _msgStack;
    if (!stack) { return 0; }
    var kids = stack.children;
    var n = kids.length;
    for (var i = n - 1; i >= 0; i--) {
      _flipDismiss(stack, kids[i], 'message-flip');
    }
    return n;
  }
  function closeAllNotifs() {
    var sides = ['right', 'left', 'top', 'bottom'];
    var n = 0;
    for (var s = 0; s < sides.length; s++) {
      var st = _notifStacks[sides[s]];
      if (!st) { continue; }
      var kids = st.children;
      n += kids.length;
      for (var i = kids.length - 1; i >= 0; i--) {
        _flipDismiss(st, kids[i], 'notif-flip-' + sides[s]);
      }
    }
    return n;
  }

  return {
    expand: expand,
    collapse: collapse,
    toggle: toggle,
    stagger: stagger,
    replay: replay,
    enter: enter,
    enterAll: enterAll,
    fadeBlur: fadeBlur,
    animateWidth: animateWidth,
    slideTo: slideTo,
    translateX: translateX,
    reveal: reveal,
    reduced: reduced,
    hasAnimate: hasAnimate,
    overlayEnter: overlayEnter,
    overlayLeave: overlayLeave,
    overlayOpen: overlayOpen,
    overlayClose: overlayClose,
    message: message,
    notification: notification,
    closeAllMessages: closeAllMessages,
    closeAllNotifs: closeAllNotifs,
    flipPre: flipPre,
    flipPost: flipPost,
    flipGroup: flipGroup,
    transition: transition,
    openOverlay: openOverlay,
    closeOverlay: closeOverlay,
    activeOverlayCount: function () { return _overlayStack.length; }
  };
});

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

  var _reducedOverride = null;
  function reduced() {
    if (_reducedOverride != null) { return _reducedOverride; }
    try {
      return !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function setReduced(value) {
    _reducedOverride = (value === null || value === undefined) ? null : (value ? true : false);
    return reduced();
  }

  function isReduced() { return reduced(); }

  function hasAnimate() {
    return typeof Element !== 'undefined' &&
           Element.prototype &&
           typeof Element.prototype.animate === 'function';
  }

  var EASE_SWIFT = 'cubic-bezier(.16, 1, .3, 1)';
  var EASE_SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';

  var tokens = {
    ease: { swift: EASE_SWIFT, spring: EASE_SPRING, linear: 'linear' },
    duration: { fast: 180, base: 400, slow: 640, count: 800 }
  };

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

  function countTo(el, to, opts) {
    opts = opts || {};
    if (!el) { return null; }
    var from = opts.from != null ? opts.from : (parseFloat(el.textContent) || 0);
    var dur = opts.duration != null ? opts.duration : 800;
    var dec = opts.decimals != null ? opts.decimals : 0;
    var prefix = opts.prefix || '';
    var suffix = opts.suffix || '';
    var ease = typeof opts.ease === 'function' ? opts.ease : function (p) { return 1 - Math.pow(1 - p, 3); };
    function fmt(v) { return prefix + Number(v).toFixed(dec) + suffix; }
    if (reduced()) {
      el.textContent = fmt(to);
      if (opts.onDone) { opts.onDone(); }
      return null;
    }
    return _tween(dur, function (p) {
      el.textContent = fmt(from + (to - from) * ease(p));
    }, function () {
      el.textContent = fmt(to);
      if (opts.onDone) { opts.onDone(); }
    });
  }

  function toggleSwitch(control, opts) {
    opts = opts || {};
    function noop() {}
    var empty = { set: noop, toggle: noop, checked: function () { return false; } };
    if (!control) { return empty; }
    var input = control.tagName && control.tagName.toLowerCase() === 'input'
      ? control
      : (control.querySelector ? control.querySelector('input[type="checkbox"], input[type="radio"]') : null);
    if (!input) { return empty; }
    var track = control.querySelector ? control.querySelector('.mv-switch-track') : null;
    if (!track && input.nextElementSibling) { track = input.nextElementSibling; }
    var thumb = track ? track.querySelector('.mv-switch-thumb') : null;
    var ease = opts.easing || EASE_SWIFT;
    function move() {
      var on = input.checked;
      if (thumb && track) {
        var t = track.clientWidth || 44;
        var th = thumb.clientWidth || 18;
        var pad = 3;
        var dx = on ? (t - th - pad * 2) : pad;
        thumb.style.transition = 'transform .24s ' + ease;
        thumb.style.webkitTransition = '-webkit-transform .24s ' + ease;
        thumb.style.transform = 'translateX(' + dx + 'px)';
        thumb.style.webkitTransform = 'translateX(' + dx + 'px)';
      }
      if (track) { track.style.background = on ? (opts.onColor || '') : (opts.offColor || ''); }
      control.setAttribute('aria-checked', on ? 'true' : 'false');
      control.setAttribute('role', 'switch');
    }
    input.addEventListener('change', move, false);
    move();
    return {
      set: function (v) { input.checked = !!v; move(); if (opts.onChange) { opts.onChange(!!v); } },
      toggle: function () { input.checked = !input.checked; move(); if (opts.onChange) { opts.onChange(input.checked); } },
      checked: function () { return input.checked; }
    };
  }

  function segmented(container, index, opts) {
    opts = opts || {};
    if (!container) { return 0; }
    var items = container.querySelectorAll('.mv-seg-item');
    if (!items.length) { return index; }
    if (index < 0 || index > items.length - 1) { index = index < 0 ? 0 : items.length - 1; }
    var prev = container.__mvSeg != null ? container.__mvSeg : index;
    var first = container.__mvSeg == null;
    container.__mvSeg = index;
    var ease = opts.easing || EASE_SWIFT;
    var dur = opts.duration != null ? opts.duration : 260;
    for (var i = 0; i < items.length; i++) {
      items[i].className = 'mv-seg-item' + (i === index ? ' on' : '');
    }
    var ind = container.querySelector('.mv-seg-ind');
    if (ind) {
      var targetLeft = items[index].offsetLeft;
      var targetW = items[index].offsetWidth;
      var tStr = 'left ' + dur + 'ms ' + ease + ', width ' + dur + 'ms ' + ease;
      if (first || prev === index) {
        ind.style.transition = 'none';
        ind.style.webkitTransition = 'none';
        ind.style.left = targetLeft + 'px';
        ind.style.width = targetW + 'px';
      } else {
        ind.style.transition = tStr;
        ind.style.webkitTransition = tStr;
        ind.style.left = targetLeft + 'px';
        ind.style.width = targetW + 'px';
      }
      if (opts.onMove) { opts.onMove(index); }
    }
    return index;
  }

  function stepper(wrapper, opts) {
    opts = opts || {};
    if (!wrapper) { return { value: function () { return 0; }, inc: noopF, dec: noopF, set: noopF }; }
    function noopF() {}
    var valEl = wrapper.querySelector('.mv-step-val');
    var minEl = wrapper.querySelector('.mv-step-minus');
    var plusEl = wrapper.querySelector('.mv-step-plus');
    var min = opts.min != null ? opts.min : 0;
    var max = opts.max != null ? opts.max : Infinity;
    var step = opts.step != null ? opts.step : 1;
    var dur = opts.duration != null ? opts.duration : 400;
    var cur = valEl ? (parseInt(valEl.textContent, 10) || 0) : 0;
    function clamp(v) { return Math.max(min, Math.min(max, v)); }
    function set(v, animate) {
      v = clamp(v);
      var from = cur;
      cur = v;
      if (valEl) {
        if (animate && from !== v) { countTo(valEl, v, { from: from, duration: dur }); }
        else { valEl.textContent = String(v); }
      }
      if (opts.onChange) { opts.onChange(v); }
      return v;
    }
    if (minEl) { minEl.onclick = function () { set(cur - step, true); }; }
    if (plusEl) { plusEl.onclick = function () { set(cur + step, true); }; }
    return {
      value: function () { return cur; },
      inc: function () { return set(cur + step, true); },
      dec: function () { return set(cur - step, true); },
      set: function (v) { return set(v, true); }
    };
  }

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
    'tooltip': {
      dur: 180, ease: EASE_SWIFT,
      from: { opacity: '0' },
      to: { opacity: '0' }
    },
    'panel-pop': {
      dur: 180, ease: EASE_SWIFT,
      from: { opacity: '0', transform: 'scale(0.96)' },
      to: { opacity: '0', transform: 'scale(0.96)' }
    },
    'spotlight': {
      dur: 280, ease: EASE_SWIFT,
      from: { opacity: '0' },
      to: { opacity: '0' }
    },
    'popover': {
      dur: 200, ease: EASE_SWIFT,
      from: { opacity: '0', filter: 'blur(6px)', transform: 'scale(0.94)' },
      to: { opacity: '0', filter: 'blur(6px)', transform: 'scale(0.94)' }
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
  var _limits = { message: 0, notif: 0 };

  function setStackLimit(kind, n) {
    n = parseInt(n, 10) || 0;
    if (kind === 'notification' || kind === 'notif') { _limits.notif = n; }
    else if (kind === 'message') { _limits.message = n; }
    return n;
  }

  function _trimStack(stack, limit) {
    if (!limit || !stack) { return; }
    var live = [];
    for (var i = 0; i < stack.children.length; i++) {
      var c = stack.children[i];
      if (!c.__mvLeaving) { live.push(c); }
    }
    while (live.length >= limit) {
      var old = live.shift();
      if (old && old.__mvDismiss) { old.__mvDismiss(); }
      else if (old && old.parentNode) { old.parentNode.removeChild(old); }
    }
  }

  function _ensureMsgStack() {
    if (!_msgStack) {
      _msgStack = document.createElement('div');
      _msgStack.className = 'mv-message-stack';
      _msgStack.setAttribute('role', 'status');
      _msgStack.setAttribute('aria-live', 'polite');
      _msgStack.setAttribute('aria-label', '消息');
      document.body.appendChild(_msgStack);
    }
    return _msgStack;
  }
  function _ensureNotifStack(side) {
    if (!_notifStacks[side]) {
      var st = document.createElement('div');
      st.className = 'mv-notif-stack';
      st.setAttribute('data-side', side);
      st.setAttribute('role', 'region');
      st.setAttribute('aria-live', 'polite');
      st.setAttribute('aria-label', '通知');
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

  function _popPosition(anchor, el, gap) {
    var r = anchor.getBoundingClientRect();
    var off = (gap == null ? 8 : gap);
    var sw = win.innerWidth || document.documentElement.clientWidth;
    var sh = win.innerHeight || document.documentElement.clientHeight;
    var ew = el.offsetWidth;
    var eh = el.offsetHeight;
    var left = r.left + r.width / 2 - ew / 2;
    var top = r.bottom + off;
    var place = 'bottom';
    if (top + eh > sh - off && r.top - off - eh >= off) { top = r.top - off - eh; place = 'top'; }
    if (left < off) { left = off; }
    if (left + ew > sw - off) { left = sw - off - ew; }
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.setAttribute('data-place', place);
  }

  function tooltip(anchor, text, opts) {
    opts = opts || {};
    if (!anchor || text == null || text === '') { return { el: null, close: function () { } }; }
    var el = document.createElement('div');
    el.className = 'mv-tooltip';
    el.setAttribute('role', 'tooltip');
    el.setAttribute('aria-hidden', 'true');
    el.appendChild(document.createTextNode(String(text)));
    document.body.appendChild(el);
    el.style.zIndex = (opts.zIndex != null ? String(opts.zIndex) : '9500');
    _popPosition(anchor, el, opts.gap);
    overlayEnter(el, 'tooltip');
    el.setAttribute('aria-hidden', 'false');
    var closed = false;
    function close() {
      if (closed) { return; }
      closed = true;
      el.setAttribute('aria-hidden', 'true');
      overlayLeave(el, 'tooltip', function () {
        if (el.parentNode) { el.parentNode.removeChild(el); }
      });
    }
    return { el: el, close: close };
  }

  function panelPop(panel, anchor, opts) {
    opts = opts || {};
    function noop() {}
    var openFlag = false;
    var onDoc = null;
    var onKey = null;
    if (!panel) { return { open: noop, close: noop, toggle: noop, isOpen: function () { return false; } }; }
    function unbind() {
      if (onDoc) { document.removeEventListener('click', onDoc, true); onDoc = null; }
      if (onKey) { document.removeEventListener('keydown', onKey, true); onKey = null; }
    }
    function bind() {
      if (opts.closeOnOutside === false) { return; }
      onDoc = function (e) {
        if (!openFlag) { return; }
        var t = e.target;
        if (panel === t || (panel.contains && panel.contains(t))) { return; }
        if (anchor && (anchor === t || (anchor.contains && anchor.contains(t)))) { return; }
        close();
      };
      onKey = function (e) {
        var k = e.keyCode || e.which;
        if (k === 27) { close(); }
      };
      document.addEventListener('click', onDoc, true);
      document.addEventListener('keydown', onKey, true);
    }
    function open() {
      if (openFlag) { return; }
      openFlag = true;
      panel.hidden = false;
      panel.style.display = '';
      if (opts.zIndex != null) { panel.style.zIndex = String(opts.zIndex); }
      if (anchor) {
        _popPosition(anchor, panel, opts.gap);
        panel.style.transformOrigin = panel.getAttribute('data-place') === 'top' ? '50% 100%' : '50% 0';
      }
      overlayEnter(panel, 'panel-pop');
      bind();
      if (opts.onOpen) { opts.onOpen(panel); }
    }
    function close() {
      if (!openFlag) { return; }
      openFlag = false;
      unbind();
      overlayLeave(panel, 'panel-pop', function () {
        panel.hidden = true;
        if (opts.onClose) { opts.onClose(panel); }
      });
    }
    function toggle() { if (openFlag) { close(); } else { open(); } }
    return { open: open, close: close, toggle: toggle, isOpen: function () { return openFlag; } };
  }

  function crossFade(container, mutate, opts) {
    opts = opts || {};
    if (!container) { return; }
    var outDur = opts.out != null ? opts.out : 140;
    var inDur = opts.duration != null ? opts.duration : 220;
    var ease = opts.easing || EASE_SWIFT;
    var dy = opts.shift != null ? opts.shift : 6;
    var gen = (container.__mvXF = (container.__mvXF || 0) + 1);
    function kids() {
      var a = [], c = container.children;
      for (var i = 0; i < c.length; i++) { a.push(c[i]); }
      return a;
    }
    function setT(el, v) { el.style.transition = v; el.style.webkitTransition = v; }
    function setY(el, v) {
      var t = v ? 'translateY(' + v + 'px)' : '';
      el.style.transform = t;
      el.style.webkitTransform = t;
    }
    function clear(el) {
      el.style.transition = '';
      el.style.webkitTransition = '';
      el.style.opacity = '';
      setY(el, 0);
    }
    function animIn() {
      if (container.__mvXF !== gen) { return; }
      if (typeof mutate === 'function') { mutate(container); }
      var els = kids();
      if (reduced()) {
        for (var r = 0; r < els.length; r++) { clear(els[r]); }
        if (opts.onDone) { opts.onDone(container); }
        return;
      }
      for (var i = 0; i < els.length; i++) {
        setT(els[i], 'none');
        els[i].style.opacity = '0';
        setY(els[i], dy);
      }
      container.offsetWidth;
      for (var j = 0; j < els.length; j++) {
        setT(els[j], 'opacity ' + inDur + 'ms ' + ease + ', transform ' + inDur + 'ms ' + ease);
        els[j].style.opacity = '1';
        setY(els[j], 0);
      }
      setTimeout(function () {
        if (container.__mvXF !== gen) { return; }
        for (var k = 0; k < els.length; k++) { clear(els[k]); }
        if (opts.onDone) { opts.onDone(container); }
      }, inDur + 40);
    }
    var cur = kids();
    if (reduced() || !cur.length) { animIn(); return; }
    for (var i = 0; i < cur.length; i++) {
      setT(cur[i], 'none');
      cur[i].style.opacity = '1';
      setY(cur[i], 0);
    }
    container.offsetWidth;
    for (var j = 0; j < cur.length; j++) {
      setT(cur[j], 'opacity ' + outDur + 'ms ' + ease + ', transform ' + outDur + 'ms ' + ease);
      cur[j].style.opacity = '0';
      setY(cur[j], -dy);
    }
    setTimeout(animIn, outDur + 20);
  }

  function carouselTo(track, index, opts) {
    opts = opts || {};
    if (!track) { return 0; }
    var n = track.children.length;
    if (!n) { return 0; }
    if (index < 0 || index > n - 1) {
      if (opts.loop) { index = ((index % n) + n) % n; }
      else { index = index < 0 ? 0 : n - 1; }
    }
    var w = opts.slideWidth != null ? opts.slideWidth : track.children[0].getBoundingClientRect().width;
    var dur = opts.duration != null ? opts.duration : 420;
    var ease = opts.easing || EASE_SWIFT;
    var cur = track.__mvSlide || 0;
    var x = -index * w;
    track.__mvSlide = index;
    function apply(v) {
      track.style.transform = 'translateX(' + v + 'px)';
      track.style.webkitTransform = 'translateX(' + v + 'px)';
    }
    if (reduced()) {
      track.style.transition = 'none';
      track.style.webkitTransition = 'none';
      apply(x);
      return index;
    }
    var gen = (track.__mvCX = (track.__mvCX || 0) + 1);
    track.style.transition = 'none';
    track.style.webkitTransition = 'none';
    apply(-cur * w);
    track.offsetWidth;
    track.style.transition = 'transform ' + dur + 'ms ' + ease;
    track.style.webkitTransition = '-webkit-transform ' + dur + 'ms ' + ease;
    apply(x);
    setTimeout(function () {
      if (track.__mvCX !== gen) { return; }
      track.style.transition = '';
      track.style.webkitTransition = '';
    }, dur + 40);
    if (opts.onChange) { opts.onChange(index); }
    return index;
  }

  function spotlight(target, opts) {
    opts = opts || {};
    if (!target) { return { el: null, close: function () { } }; }
    var pad = opts.padding != null ? opts.padding : 8;
    var el = document.createElement('div');
    el.className = 'mv-spotlight';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    el.style.zIndex = (opts.zIndex != null ? String(opts.zIndex) : '9400');
    if (opts.color) { el.style.boxShadow = '0 0 0 9999px ' + opts.color; }
    if (opts.radius != null) { el.style.borderRadius = opts.radius + 'px'; }
    function place() {
      var r = target.getBoundingClientRect();
      el.style.left = (r.left - pad) + 'px';
      el.style.top = (r.top - pad) + 'px';
      el.style.width = (r.width + pad * 2) + 'px';
      el.style.height = (r.height + pad * 2) + 'px';
    }
    place();
    overlayEnter(el, 'spotlight', { afterEnter: function () {
      if (el.parentNode) { _addClass(el, 'mv-spotlight-move'); }
    } });
    function onMove() { if (el.parentNode) { place(); } }
    document.addEventListener('scroll', onMove, true);
    document.addEventListener('resize', onMove, false);
    var closed = false;
    function close() {
      if (closed) { return; }
      closed = true;
      document.removeEventListener('scroll', onMove, true);
      document.removeEventListener('resize', onMove, false);
      _removeClass(el, 'mv-spotlight-move');
      overlayLeave(el, 'spotlight', function () {
        if (el.parentNode) { el.parentNode.removeChild(el); }
        if (opts.onClosed) { opts.onClosed(); }
      });
    }
    return { el: el, close: close, reposition: place };
  }

  function popover(anchor, content, opts) {
    opts = opts || {};
    var openFlag = false;
    var onDoc = null;
    var onKey = null;
    var el = null;
    function noop() {}
    if (!anchor) { return { open: noop, close: noop, toggle: noop, isOpen: function () { return false; } }; }
    function unbind() {
      if (onDoc) { document.removeEventListener('click', onDoc, true); onDoc = null; }
      if (onKey) { document.removeEventListener('keydown', onKey, true); onKey = null; }
    }
    function bind() {
      if (opts.closeOnOutside === false) { return; }
      onDoc = function (e) {
        if (!openFlag) { return; }
        var t = e.target;
        if (el && (el === t || (el.contains && el.contains(t)))) { return; }
        if (anchor === t || (anchor.contains && anchor.contains(t))) { return; }
        close();
      };
      onKey = function (e) {
        var k = e.keyCode || e.which;
        if (k === 27) { close(); }
      };
      document.addEventListener('click', onDoc, true);
      document.addEventListener('keydown', onKey, true);
    }
    function open() {
      if (openFlag) { return; }
      openFlag = true;
      el = document.createElement('div');
      el.className = 'mv-popover';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-hidden', 'true');
      var arrow = document.createElement('div');
      arrow.className = 'mv-popover-arrow';
      el.appendChild(arrow);
      if (typeof content === 'string') {
        var node = document.createElement('div');
        node.className = 'mv-popover-body';
        node.appendChild(document.createTextNode(content));
        el.appendChild(node);
      } else if (content && content.nodeType === 1) {
        el.appendChild(content);
      }
      if (opts.zIndex != null) { el.style.zIndex = String(opts.zIndex); }
      document.body.appendChild(el);
      _popPosition(anchor, el, opts.gap);
      el.style.transformOrigin = el.getAttribute('data-place') === 'top' ? '50% 100%' : '50% 0';
      el.setAttribute('aria-hidden', 'false');
      overlayEnter(el, 'popover');
      bind();
      if (opts.onOpen) { opts.onOpen(el); }
    }
    function close() {
      if (!openFlag) { return; }
      openFlag = false;
      unbind();
      var target = el;
      el = null;
      if (!target) { return; }
      target.setAttribute('aria-hidden', 'true');
      overlayLeave(target, 'popover', function () {
        if (target.parentNode) { target.parentNode.removeChild(target); }
        if (opts.onClose) { opts.onClose(target); }
      });
    }
    function toggle() { if (openFlag) { close(); } else { open(); } }
    return {
      open: open, close: close, toggle: toggle,
      isOpen: function () { return openFlag; }
    };
  }

  function imageReveal(img, opts) {
    opts = opts || {};
    if (!img) { return null; }
    var dur = opts.duration != null ? opts.duration : 500;
    var blur = opts.blur != null ? opts.blur : 8;
    var ease = opts.easing || EASE_SWIFT;
    function setStyle(o, f) {
      img.style.opacity = o;
      if (f == null) {
        img.style.filter = '';
        img.style.webkitFilter = '';
      } else {
        img.style.filter = f;
        img.style.webkitFilter = f;
      }
    }
    function show() {
      if (reduced()) { setStyle('1', null); if (opts.onShown) { opts.onShown(img); } return; }
      setStyle('0', 'blur(' + blur + 'px)');
      img.style.transition = 'none';
      img.style.webkitTransition = 'none';
      img.offsetWidth;
      img.style.transition = 'opacity ' + dur + 'ms ' + ease + ', filter ' + dur + 'ms ' + ease;
      img.style.webkitTransition = '-webkit-opacity ' + dur + 'ms ' + ease + ', -webkit-filter ' + dur + 'ms ' + ease;
      setStyle('1', null);
      setTimeout(function () {
        img.style.transition = '';
        img.style.webkitTransition = '';
        img.style.filter = '';
        img.style.webkitFilter = '';
        if (opts.onShown) { opts.onShown(img); }
      }, dur + 40);
    }
    if (img.complete && img.naturalWidth > 0) {
      show();
      return { el: img, show: show };
    }
    var done = false;
    function onLoad() { if (done) { return; } done = true; show(); }
    img.addEventListener('load', onLoad, false);
    img.addEventListener('error', onLoad, false);
    return { el: img, show: show };
  }

  function setProgress(el, value, opts) {
    opts = opts || {};
    if (!el) { return null; }
    value = Math.max(0, Math.min(100, value));
    var dur = opts.duration != null ? opts.duration : 500;
    var ease = typeof opts.ease === 'function' ? opts.ease : function (p) { return 1 - Math.pow(1 - p, 3); };
    var isRing = el.tagName && el.tagName.toLowerCase() === 'circle';
    var from = el.__mvProgress != null ? el.__mvProgress : 0;
    function apply(v) {
      if (isRing) {
        var len = parseFloat(el.getAttribute('data-pathlength') || '100');
        el.style.strokeDashoffset = String((1 - v / 100) * len);
      } else {
        el.style.transform = 'scaleX(' + (v / 100) + ')';
        el.style.webkitTransform = 'scaleX(' + (v / 100) + ')';
      }
      el.__mvProgress = v;
    }
    if (reduced()) {
      apply(value);
      return null;
    }
    apply(from);
    return _tween(dur, function (p) {
      apply(from + (value - from) * ease(p));
    }, function () {
      apply(value);
      if (opts.onDone) { opts.onDone(value); }
    });
  }

  function _transitionProps(el, from, to, opts) {
    opts = opts || {};
    if (!el) { return { cancel: function () { } }; }
    var dur = opts.duration != null ? opts.duration : 400;
    var ease = opts.easing || EASE_SWIFT;
    var uniq = [];
    function collect(s) {
      for (var k in s) {
        if (s.hasOwnProperty(k) && uniq.indexOf(k) === -1) { uniq.push(k); }
      }
    }
    collect(from);
    collect(to);
    function apply(state) {
      for (var k in state) {
        if (state.hasOwnProperty(k)) {
          el.style[k] = state[k];
          if (k === 'transform') { el.style.webkitTransform = state[k]; }
          if (k === 'filter') { el.style.webkitFilter = state[k]; }
        }
      }
    }
    function clearProps() {
      el.style.transition = '';
      el.style.webkitTransition = '';
    }
    var list = [];
    for (var m = 0; m < uniq.length; m++) {
      var pname = uniq[m];
      list.push(pname + ' ' + dur + 'ms ' + ease);
      if (pname === 'transform') { list.push('-webkit-transform ' + dur + 'ms ' + ease); }
      if (pname === 'filter') { list.push('-webkit-filter ' + dur + 'ms ' + ease); }
    }
    var transitionStr = list.join(', ');
    var timer = null;
    var done = false;
    function finish() {
      if (done) { return; }
      done = true;
      if (timer) { clearTimeout(timer); timer = null; }
      clearProps();
      if (opts.onDone) { opts.onDone(el); }
    }
    if (reduced()) {
      apply(to);
      clearProps();
      if (opts.onDone) { opts.onDone(el); }
      return { cancel: function () { } };
    }
    el.style.transition = 'none';
    el.style.webkitTransition = 'none';
    apply(from);
    el.offsetWidth;
    el.style.transition = transitionStr;
    el.style.webkitTransition = transitionStr;
    apply(to);
    timer = setTimeout(finish, dur + 40);
    return {
      cancel: function () {
        if (done) { return; }
        finish();
      }
    };
  }

  function fadeIn(el, opts) {
    opts = opts || {};
    var from = { opacity: 0 };
    if (opts.scale != null) { from.transform = 'scale(' + opts.scale + ')'; }
    else if (opts.translateY) { from.transform = 'translateY(' + opts.translateY + 'px)'; }
    else { from.transform = 'translateY(0px)'; }
    return _transitionProps(el, from, { opacity: 1, transform: 'translateY(0px)' }, opts);
  }

  function fadeOut(el, opts) {
    opts = opts || {};
    var to = { opacity: 0 };
    if (opts.scale != null) { to.transform = 'scale(' + opts.scale + ')'; }
    else if (opts.translateY) { to.transform = 'translateY(' + opts.translateY + 'px)'; }
    else { to.transform = 'translateY(0px)'; }
    return _transitionProps(el, { opacity: 1, transform: 'translateY(0px)' }, to, opts);
  }

  function slideUp(el, opts) {
    opts = opts || {};
    var y = opts.distance != null ? opts.distance : 16;
    return _transitionProps(el, { opacity: 0, transform: 'translateY(' + y + 'px)' }, { opacity: 1, transform: 'translateY(0px)' }, opts);
  }

  function slideDown(el, opts) {
    opts = opts || {};
    var y = opts.distance != null ? opts.distance : 16;
    return _transitionProps(el, { opacity: 1, transform: 'translateY(0px)' }, { opacity: 0, transform: 'translateY(-' + y + 'px)' }, opts);
  }

  function _toArray(nodes) {
    var out = [];
    if (!nodes) { return out; }
    if (typeof nodes === 'string') {
      var list = document.querySelectorAll(nodes);
      for (var i = 0; i < list.length; i++) { out.push(list[i]); }
    } else if (nodes.nodeType === 1) {
      out.push(nodes);
    } else if (nodes.length) {
      for (var j = 0; j < nodes.length; j++) { out.push(nodes[j]); }
    }
    return out;
  }

  function accordion(wrapper, opts) {
    opts = opts || {};
    var single = opts.single !== false;
    var dur = opts.duration;
    var items = [];
    var itemEls;
    if (typeof wrapper === 'string') {
      itemEls = _toArray(wrapper === '.acc-item' ? wrapper : wrapper + ' .acc-item, ' + wrapper);
    } else {
      var found = wrapper && wrapper.querySelectorAll ? wrapper.querySelectorAll('.acc-item') : null;
      itemEls = (found && found.length) ? _toArray(found) : _toArray(wrapper);
    }
    for (var k = 0; k < itemEls.length; k++) {
      var it = itemEls[k];
      var trigger = it.querySelector('[data-acc-trigger]');
      var panel = it.querySelector('[data-acc-panel]');
      if (!trigger || !panel) { continue; }
      if (!panel.id) { panel.id = 'acc-panel-' + k; }
      if (!trigger.id) { trigger.id = 'acc-trigger-' + k; }
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', trigger.id);
      panel.setAttribute('aria-hidden', 'true');
      panel.style.overflow = 'hidden';
      panel.style.height = '0px';
      panel.style.opacity = '0';
      var item = { el: it, trigger: trigger, panel: panel, open: false, index: items.length };
      items.push(item);
      (function (idx) {
        trigger.onclick = function () { doToggle(idx); };
        trigger.onkeydown = function (e) {
          var code = e.keyCode || e.which;
          if (code === 13 || code === 32) { e.preventDefault(); doToggle(idx); }
        };
      })(item.index);
    }
    function setOpen(item, open) {
      if (!item) { return; }
      item.open = open;
      item.trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      item.panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) { expand(item.panel, dur); } else { collapse(item.panel, dur); }
    }
    function doOpen(i) {
      var it = items[i];
      if (!it) { return; }
      if (single) { for (var x = 0; x < items.length; x++) { if (items[x] !== it && items[x].open) { setOpen(items[x], false); } } }
      setOpen(it, true);
      if (opts.onOpen) { opts.onOpen(it); }
    }
    function doClose(i) {
      var it = items[i];
      if (!it || !it.open) { return; }
      setOpen(it, false);
      if (opts.onClose) { opts.onClose(it); }
    }
    function doToggle(i) {
      var it = items[i];
      if (!it) { return; }
      if (it.open) { doClose(i); } else { doOpen(i); }
    }
    var api = {
      open: doOpen,
      close: doClose,
      toggle: doToggle,
      isOpen: function (i) { return items[i] ? items[i].open : false; },
      items: items
    };
    if (opts.openFirst !== false && items.length) { doOpen(0); }
    return api;
  }

  function scrollSpy(nav, sections, opts) {
    opts = opts || {};
    var cls = opts.className || 'on';
    var root = opts.root || null;
    var navItems = _toArray(nav);
    var targetToItem = {};
    for (var i = 0; i < navItems.length; i++) {
      var t = navItems[i].getAttribute('data-target');
      if (t) { targetToItem[t] = navItems[i]; }
    }
    var secArr = _toArray(sections);
    function pick() {
      var best = null;
      var bestTop = Infinity;
      for (var s = 0; s < secArr.length; s++) {
        var el = secArr[s];
        if (!el.id || !visible[el.id]) { continue; }
        var top = el.getBoundingClientRect().top - (root ? root.getBoundingClientRect().top : 0);
        if (top < bestTop) { bestTop = top; best = el; }
      }
      if (best) { set(best); }
    }
    function set(secEl) {
      var id = secEl.id;
      for (var key in targetToItem) {
        if (!targetToItem.hasOwnProperty(key)) { continue; }
        if (key === id) { _addClass(targetToItem[key], cls); }
        else { _removeClass(targetToItem[key], cls); }
      }
      if (targetToItem[id] && opts.onEnter) { opts.onEnter(targetToItem[id], secEl); }
    }
    var visible = {};
    if (typeof IntersectionObserver !== 'undefined') {
      var io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          var el = entries[e].target;
          if (el.id) { visible[el.id] = entries[e].isIntersecting; }
        }
        pick();
      }, {
        root: root,
        rootMargin: opts.rootMargin || '-20% 0px -60% 0px',
        threshold: opts.threshold != null ? opts.threshold : 0.2
      });
      for (var s = 0; s < secArr.length; s++) { io.observe(secArr[s]); }
      return { disconnect: function () { io.disconnect(); } };
    }
    var ticking = false;
    function check() {
      ticking = false;
      var band = root ? root.getBoundingClientRect() : { top: 0, bottom: win.innerHeight || document.documentElement.clientHeight };
      for (var s = 0; s < secArr.length; s++) {
        var el = secArr[s];
        if (!el.id) { continue; }
        var r = el.getBoundingClientRect();
        visible[el.id] = r.bottom > band.top && r.top < band.bottom;
      }
      pick();
    }
    function onScroll() { if (!ticking) { ticking = true; raf(check); } }
    var scroller = root || win;
    scroller.addEventListener('scroll', onScroll, false);
    scroller.addEventListener('resize', onScroll, false);
    check();
    return { disconnect: function () {
      scroller.removeEventListener('scroll', onScroll, false);
      scroller.removeEventListener('resize', onScroll, false);
    } };
  }

  function watchReducedMotion(cb) {
    var mql = null;
    try { mql = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { mql = null; }
    if (!mql) {
      return { matches: function () { return reduced(); }, disconnect: function () { } };
    }
    var handler = function (evt) { if (typeof cb === 'function') { cb(evt && evt.matches !== undefined ? evt.matches : mql.matches); } };
    if (mql.addEventListener) { mql.addEventListener('change', handler, false); }
    else if (mql.addListener) { mql.addListener(handler); }
    return {
      matches: function () { return mql.matches; },
      disconnect: function () {
        if (mql.removeEventListener) { mql.removeEventListener('change', handler, false); }
        else if (mql.removeListener) { mql.removeListener(handler); }
      }
    };
  }

  function hoverLift(el, opts) {
    opts = opts || {};
    if (!el) { return { lift: function () { }, release: function () { }, unbind: function () { } }; }
    var liftY = opts.distance != null ? opts.distance : -3;
    var shadow = opts.shadow != null ? opts.shadow : '0 8px 24px rgba(0, 0, 0, .14)';
    var dur = opts.duration != null ? opts.duration : 200;
    var ease = opts.easing || EASE_SWIFT;
    function set(on) {
      el.style.transition = 'transform ' + dur + 'ms ' + ease + ', box-shadow ' + dur + 'ms ' + ease;
      el.style.webkitTransition = '-webkit-transform ' + dur + 'ms ' + ease + ', -webkit-box-shadow ' + dur + 'ms ' + ease;
      if (on) {
        el.style.transform = 'translateY(' + liftY + 'px)';
        el.style.webkitTransform = 'translateY(' + liftY + 'px)';
        el.style.boxShadow = shadow;
        el.style.webkitBoxShadow = shadow;
      } else {
        el.style.transform = '';
        el.style.webkitTransform = '';
        el.style.boxShadow = '';
        el.style.webkitBoxShadow = '';
      }
    }
    var onEnter = function () { set(true); };
    var onLeave = function () { set(false); };
    el.addEventListener('mouseenter', onEnter, false);
    el.addEventListener('mouseleave', onLeave, false);
    el.addEventListener('focus', onEnter, false);
    el.addEventListener('blur', onLeave, false);
    return {
      lift: function () { set(true); },
      release: function () { set(false); },
      unbind: function () {
        el.removeEventListener('mouseenter', onEnter, false);
        el.removeEventListener('mouseleave', onLeave, false);
        el.removeEventListener('focus', onEnter, false);
        el.removeEventListener('blur', onLeave, false);
      }
    };
  }

  function revealOn(targets, opts) {
    opts = opts || {};
    var els = [];
    if (typeof targets === 'string') {
      var list = document.querySelectorAll(targets);
      for (var i = 0; i < list.length; i++) { els.push(list[i]); }
    } else if (targets && targets.nodeType === 1) {
      els.push(targets);
    } else if (targets && targets.length) {
      for (var j = 0; j < targets.length; j++) { els.push(targets[j]); }
    }
    var cls = opts.className || 'mv-scroll-reveal-in';
    function show(el, idx) {
      if (!el || el.__mvRevealed) { return; }
      el.__mvRevealed = true;
      var d = (opts.stagger ? idx * opts.stagger : 0) + (opts.delay || 0);
      if (d) {
        el.style.transitionDelay = d + 'ms';
        el.style.webkitTransitionDelay = d + 'ms';
      }
      _addClass(el, cls);
    }
    if (!els.length) { return { disconnect: function () { } }; }
    if (reduced()) {
      for (var r = 0; r < els.length; r++) { show(els[r], r); }
      return { disconnect: function () { } };
    }
    if (typeof IntersectionObserver !== 'undefined') {
      var io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) {
            show(entries[e].target, els.indexOf(entries[e].target));
            if (opts.once !== false) { io.unobserve(entries[e].target); }
          }
        }
      }, {
        root: opts.root || null,
        rootMargin: opts.rootMargin || '0px',
        threshold: opts.threshold != null ? opts.threshold : 0.15
      });
      for (var o = 0; o < els.length; o++) { io.observe(els[o]); }
      return { disconnect: function () { io.disconnect(); } };
    }
    var ticking = false;
    function check() {
      ticking = false;
      var vh = win.innerHeight || document.documentElement.clientHeight;
      var th = opts.threshold != null ? opts.threshold : 0.15;
      for (var k = 0; k < els.length; k++) {
        var el = els[k];
        if (el.__mvRevealed) { continue; }
        var rc = el.getBoundingClientRect();
        if (rc.top < vh * (1 - th) && rc.bottom > 0) { show(el, k); }
      }
    }
    function onScroll() { if (!ticking) { ticking = true; raf(check); } }
    win.addEventListener('scroll', onScroll, false);
    win.addEventListener('resize', onScroll, false);
    check();
    return { disconnect: function () {
      win.removeEventListener('scroll', onScroll, false);
      win.removeEventListener('resize', onScroll, false);
    } };
  }

  function sequence(steps, opts) {
    opts = opts || {};
    var i = 0;
    var cancelled = false;
    var timer = null;
    var len = steps && steps.length;
    function advance() {
      if (cancelled) { return; }
      if (i >= len) { if (opts.onDone) { opts.onDone(); } return; }
      var s = steps[i++];
      if (typeof s === 'number') {
        timer = setTimeout(advance, s);
        return;
      }
      if (typeof s === 'function') {
        var called = false;
        var r;
        try {
          r = s(function (extra) {
            if (called) { return; }
            called = true;
            if (typeof extra === 'number') { timer = setTimeout(advance, extra); }
            else { advance(); }
          });
        } catch (e) {
          r = 0;
        }
        if (!called) {
          if (typeof r === 'number') { timer = setTimeout(advance, r); }
          else { advance(); }
        }
        return;
      }
      advance();
    }
    advance();
    return {
      cancel: function () {
        cancelled = true;
        if (timer) { clearTimeout(timer); }
      }
    };
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
    _trimStack(stack, opts.max != null ? opts.max : _limits.message);
    el.__mvDismiss = dismiss;
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
    _trimStack(stack, opts.max != null ? opts.max : _limits.notif);
    el.__mvDismiss = dismiss;
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
    countTo: countTo,
    sequence: sequence,
    tokens: tokens,
    reveal: reveal,
    reduced: reduced,
    setReduced: setReduced,
    isReduced: isReduced,
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
    activeOverlayCount: function () { return _overlayStack.length; },
    tooltip: tooltip,
    panelPop: panelPop,
    crossFade: crossFade,
    carouselTo: carouselTo,
    spotlight: spotlight,
    revealOn: revealOn,
    setStackLimit: setStackLimit,
    popover: popover,
    imageReveal: imageReveal,
    setProgress: setProgress,
    fadeIn: fadeIn,
    fadeOut: fadeOut,
    slideUp: slideUp,
    slideDown: slideDown,
    accordion: accordion,
    scrollSpy: scrollSpy,
    watchReducedMotion: watchReducedMotion,
    hoverLift: hoverLift,
    toggleSwitch: toggleSwitch,
    segmented: segmented,
    stepper: stepper
  };
});

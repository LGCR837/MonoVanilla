/*!
 * fuxsto-anim.js  v1.0.0
 * ------------------------------------------------------------------
 * design.fuxsto.cn 动画的兼容辅助脚本, 纯 ES5 / 无构建 / 无框架。
 *
 * 原站用 Vue3 + Web Animations API 做折叠面板的高度 count-up/count-down,
 * 这里用等价的原生实现, 并向下兼容到 Chrome 38 (2014-10)。
 *
 * 提供:
 *   FxAnim.expand(el, duration, easing)    展开 (height 0 -> 内容高, 淡入)
 *   FxAnim.collapse(el, duration, easing)  收起 (height 内容高 -> 0, 淡出)
 *   FxAnim.toggle(el, duration, easing)    切换展开/收起
 *   FxAnim.stagger(container, step, capMs) 给子元素写递增 animation-delay
 *   FxAnim.replay(el, className)           重播某个 .animate-* 动画
 *   FxAnim.reduced()                       当前是否处于 reduced-motion
 *
 * 兼容策略:
 *   - 优先使用 Element.animate() (Chrome 36+); 不可用时回退到
 *     requestAnimationFrame 的线性补间 (Chrome 10+)。
 *   - 用户开启 reduced-motion 时直接跳到终态, 不播放动画。
 * ------------------------------------------------------------------
 */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.FxAnim = factory();
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

  /* rAF 线性补间, 供无 WAAPI 的老浏览器使用 */
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
    var open = el.offsetHeight > 0 && el.getAttribute('data-fx-open') !== 'false';
    if (el.getAttribute('data-fx-open') === 'true') { open = true; }
    if (open) {
      el.setAttribute('data-fx-open', 'false');
      return collapse(el, duration, easing);
    }
    el.setAttribute('data-fx-open', 'true');
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

  /* ---- 入场动效 (等价 useEntryAnimate) ---- */
  function enter(el, delay, lite) {
    if (!el || !el.classList) { return; }
    delay = delay == null ? 0 : delay;
    el.classList.remove('fx-enter-active');
    el.classList.add(lite ? 'fx-enter-lite' : 'fx-enter');
    if (lite) { el.classList.remove('fx-enter'); } else { el.classList.remove('fx-enter-lite'); }
    function go() {
      if (reduced()) {
        el.classList.remove('fx-enter');
        el.classList.remove('fx-enter-lite');
        el.classList.add('fx-enter-active');
        return;
      }
      raf(function () { el.classList.add('fx-enter-active'); });
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

  /* ---- 淡入 + 模糊 (原站 BackTop) ---- */
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

  /* ---- 通用数值补间 (width / height / left / x) ---- */
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

  /* ---- 揭示开关 (fx-reveal) ---- */
  function reveal(el, open) {
    if (!el || !el.classList) { return; }
    if (open) { el.classList.add('fx-reveal-open'); }
    else { el.classList.remove('fx-reveal-open'); }
  }

  function replay(el, className) {
    if (!el) { return; }
    var cls = className || 'animate-row-fade';
    if (el.classList) {
      el.classList.remove(cls);
    } else {
      el.className = el.className.replace(new RegExp('(^|\\s)' + cls + '(\\s|$)', 'g'), ' ');
    }
    /* 强制重排以重启 CSS 动画 */
    /* eslint-disable no-unused-expressions */
    el.offsetWidth;
    if (el.classList) {
      el.classList.add(cls);
    } else if (el.className.indexOf(cls) === -1) {
      el.className += ' ' + cls;
    }
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
    hasAnimate: hasAnimate
  };
});

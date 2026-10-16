/*!
 * fuxsto-anim.js  v1.1.0
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
 *   FxAnim.overlayEnter(el, name)          浮层/通知「进入」(Vue Transition 等价)
 *   FxAnim.overlayLeave(el, name, onDone)  浮层/通知「离开」
 *   FxAnim.message(opts)                   命令式 Message (顶部堆叠, 自动消失)
 *   FxAnim.notification(opts)              命令式 Notification (四方位堆叠)
 *   FxAnim.closeAllMessages() / closeAllNotifs()  清空对应堆栈
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

  /* ============================================================
   * 浮层 / 通知过渡 (对应原站 Vue <Transition> 钩子类名)
   * 类名定义见 fuxsto-animations.css 第 6 节:
   *   message-flip / notif-flip-{right,left,top,bottom}
   *   dialog-pop / dialog-mask / drawer-{right,left,top,bottom} / drawer-mask
   *   dropdown / alert-expand / alert-icon-pop / backtop-fade
   * ============================================================ */

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

  /* 监听 transitionend, 超时时兜底 (transition 未发生 / 老浏览器) */
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

  /* 「进入」: 加 enter-active + enter-from, 强制重排后去掉 enter-from,
     元素从 enter-from 过渡到自然状态 */
  function overlayEnter(el, name) {
    if (!el || !name) { return; }
    _addClass(el, name + '-enter-active');
    _addClass(el, name + '-enter-from');
    el.offsetWidth;
    if (reduced()) {
      _removeClass(el, name + '-enter-from');
      _removeClass(el, name + '-enter-active');
      return;
    }
    raf(function () { _removeClass(el, name + '-enter-from'); });
    _watchTransition(el, function () { _removeClass(el, name + '-enter-active'); }, 480);
  }

  /* 「离开」: 加 leave-active, 重排后加 leave-to, 过渡结束回调 onDone */
  function overlayLeave(el, name, onDone) {
    if (!el || !name) { if (onDone) { onDone(); } return; }
    if (reduced()) {
      _removeClass(el, name + '-enter-active');
      if (onDone) { onDone(); }
      return;
    }
    _addClass(el, name + '-leave-active');
    el.offsetWidth;
    raf(function () { _addClass(el, name + '-leave-to'); });
    _watchTransition(el, function () {
      _removeClass(el, name + '-leave-active');
      _removeClass(el, name + '-leave-to');
      if (onDone) { onDone(); }
    }, 480);
  }

  /* ---- Message / Notification 命令式 API ---- */
  var _msgStack = null;
  var _notifStacks = {};

  function _ensureMsgStack() {
    if (!_msgStack) {
      _msgStack = document.createElement('div');
      _msgStack.className = 'fx-message-stack';
      document.body.appendChild(_msgStack);
    }
    return _msgStack;
  }
  function _ensureNotifStack(side) {
    if (!_notifStacks[side]) {
      var st = document.createElement('div');
      st.className = 'fx-notif-stack';
      st.setAttribute('data-side', side);
      document.body.appendChild(st);
      _notifStacks[side] = st;
    }
    return _notifStacks[side];
  }

  /* 从堆栈中移除一项: 走 leave 过渡, 同时给兄弟项做 FLIP 位移,
     复刻原站 transition-group 的 move 效果 */
  function _flipDismiss(stack, el, name, onDone) {
    var kids = stack.children;
    var oldTops = [];
    var idx = 0;
    var i, k;
    for (i = 0; i < kids.length; i++) {
      oldTops[i] = kids[i].offsetTop;
      if (kids[i] === el) { idx = i; }
    }
    _addClass(el, name + '-leave-active');
    el.offsetWidth;
    for (i = idx + 1; i < kids.length; i++) {
      var delta = kids[i].offsetTop - oldTops[i];
      if (delta !== 0) {
        kids[i].style.webkitTransform = 'translateY(' + delta + 'px)';
        kids[i].style.transform = 'translateY(' + delta + 'px)';
        _addClass(kids[i], name + '-move');
      }
    }
    stack.offsetWidth;
    for (i = idx + 1; i < kids.length; i++) {
      if (kids[i].style.transform) {
        kids[i].style.transform = '';
        kids[i].style.webkitTransform = '';
      }
    }
    setTimeout(function () {
      for (k = idx + 1; k < kids.length; k++) { _removeClass(kids[k], name + '-move'); }
    }, 480);
    _watchTransition(el, function () {
      _removeClass(el, name + '-leave-active');
      _removeClass(el, name + '-leave-to');
      if (el.parentNode) { el.parentNode.removeChild(el); }
      if (onDone) { onDone(); }
    }, 480);
  }

  /* FxAnim.message({ type, text, duration, closable, onRemove }) */
  function message(opts) {
    opts = opts || {};
    var type = opts.type || 'info';
    var duration = opts.duration == null ? 3000 : opts.duration;
    var stack = _ensureMsgStack();
    var el = document.createElement('div');
    el.className = 'fx-message';
    el.setAttribute('data-type', type);
    var dot = document.createElement('span');
    dot.className = 'fx-msg-dot';
    el.appendChild(dot);
    var label = document.createElement('span');
    label.className = 'fx-msg-text';
    label.textContent = opts.text || '';
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
      closeBtn.className = 'fx-msg-close';
      closeBtn.type = 'button';
      closeBtn.textContent = '\u00d7';
      closeBtn.onclick = dismiss;
      el.appendChild(closeBtn);
    }
    stack.appendChild(el);
    overlayEnter(el, 'message-flip');
    if (duration > 0) { setTimeout(dismiss, duration); }
    return el;
  }

  /* FxAnim.notification({ side, title, text, duration, closable, onRemove }) */
  function notification(opts) {
    opts = opts || {};
    var side = opts.side || 'right';
    var duration = opts.duration == null ? 5000 : opts.duration;
    var stack = _ensureNotifStack(side);
    var el = document.createElement('div');
    el.className = 'fx-notif';
    if (opts.title) {
      var t = document.createElement('div');
      t.className = 'fx-notif-title';
      t.textContent = opts.title;
      el.appendChild(t);
    }
    if (opts.text) {
      var d = document.createElement('div');
      d.className = 'fx-notif-text';
      d.textContent = opts.text;
      el.appendChild(d);
    }
    var dismissed = false;
    function dismiss() {
      if (dismissed) { return; }
      dismissed = true;
      _flipDismiss(stack, el, 'notif-flip-' + side, function () {
        if (opts.onRemove) { opts.onRemove(); }
      });
    }
    if (opts.closable) {
      var cb = document.createElement('button');
      cb.className = 'fx-msg-close';
      cb.type = 'button';
      cb.textContent = '\u00d7';
      cb.onclick = dismiss;
      el.appendChild(cb);
    }
    if (side === 'bottom') {
      stack.insertBefore(el, stack.firstChild || null);
    } else {
      stack.appendChild(el);
    }
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
    message: message,
    notification: notification,
    closeAllMessages: closeAllMessages,
    closeAllNotifs: closeAllNotifs
  };
});

/*!
 * monovanilla-anim.js  v2.0.0
 * 原名 fuxsto-anim.js / FxAnim, 2026-10-17 起项目更名 MonoVanilla, 全局 API 为 MVAnim。
 * ------------------------------------------------------------------
 * design.fuxsto.cn 动画的兼容辅助脚本, 纯 ES5 / 无构建 / 无框架。
 *
 * 原站用 Vue3 + Web Animations API 做折叠面板的高度 count-up/count-down,
 * 这里用等价的原生实现, 并向下兼容到 Chrome 38 (2014-10)。
 *
 * 提供:
 *   MVAnim.expand(el, duration, easing)    展开 (height 0 -> 内容高, 淡入)
 *   MVAnim.collapse(el, duration, easing)  收起 (height 内容高 -> 0, 淡出)
 *   MVAnim.toggle(el, duration, easing)    切换展开/收起
 *   MVAnim.stagger(container, step, capMs) 给子元素写递增 animation-delay
 *   MVAnim.replay(el, className)           重播某个 .animate-* 动画
 *   MVAnim.reduced()                       当前是否处于 reduced-motion
 *   MVAnim.overlayEnter(el, name)          浮层/通知「进入」(Vue Transition 等价)
 *   MVAnim.overlayLeave(el, name, onDone)  浮层/通知「离开」
 *   MVAnim.overlayOpen(mask, panel, wrap, name)     打开浮层 (清 hidden/display)
 *   MVAnim.overlayClose(mask, panel, wrap, name)    关闭浮层 (动画后 display:none)
 *   MVAnim.message(opts)                   命令式 Message (顶部堆叠, 自动消失)
 *   MVAnim.notification(opts)              命令式 Notification (四方位堆叠)
 *   MVAnim.closeAllMessages() / closeAllNotifs()  清空对应堆栈
 *
 * 兼容策略:
 *   - 优先使用 Element.animate() (Chrome 36+); 不可用时回退到
 *     requestAnimationFrame 的线性补间 (Chrome 10+)。
 *   - 用户开启 reduced-motion 时直接跳到终态, 不播放动画。
 *   - v2.0: 浮层 enter/leave 与 FLIP 位移改用 WAAPI 驱动 (Chrome 36+):
 *     元素刚从 display:none 恢复的同一任务内 CSS transition 不会启动,
 *     类方案会出现弹层直切; WAAPI 不受该问题影响。
 * ------------------------------------------------------------------
 */
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

  /* ---- 入场动效 (等价 useEntryAnimate) ---- */
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

  /* ---- 揭示开关 (mv-reveal) ---- */
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
   * 类名定义见 monovanilla-animations.css 第 6 节:
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

  /* ============================================================
   * 浮层 start/end 状态的「内联镜像表」。
   *
   * 为什么不用纯类: 实测在真实 Chrome 里, 元素刚从 display:none / hidden
   * 恢复可见、或经历过一轮完整开合周期后, *-enter-from / *-leave-to 这类
   * 类规则不一定会重新参与样式求值 —— 起点状态根本落不到计算样式里,
   * 过渡因此完全不发生 (弹回 / 直切)。内联样式同帧必达, 用它保证
   * 起点/终点, 类只负责提供 transition 定义 (与 -active 规则配套) 和
   * 与原站类名的一致性。改这里必须与 monovanilla-animations.css 第 6 节同步。
   * ============================================================ */
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
  /* 整树重排, 确保状态真正落入计算样式 (元素刚恢复可见时, 只重排自身不可靠) */
  function _reflowAll(el) {
    try {
      if (typeof document !== 'undefined' && document.body) { document.body.offsetWidth; }
    } catch (e) { /* 非浏览器环境 */ }
    el.offsetWidth;
  }

  /* 把状态表对象转成 WAAPI 关键帧 (camelCase 属性名, Chrome 38 可识别的项) */
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

  /* 「进入」: 起点=from 状态, 终点=自然状态。
     优先 WAAPI (Chrome 36+): 不走 transition 引擎 —— 实测元素刚从
     display:none / hidden 恢复可见的同一任务内, CSS transition 不会
     启动 (起点状态落不进计算样式), 表现为弹层直切。WAAPI 直接驱动
     渲染, 不受该问题影响。WAAPI 不可用时回退 类+内联 方案。 */
  function overlayEnter(el, name) {
    if (!el || !name) { return; }
    var st = _OVERLAY_STATE[name];
    var dur = (st && st.dur) || 400;
    var ease = (st && st.ease) || EASE_SWIFT;
    var gen = (el.__fxGen = (el.__fxGen || 0) + 1);
    el.__fxLeaving = false;
    if (el.__fxAnim) {
      try { el.__fxAnim.cancel(); } catch (e2) { /* noop */ }
      el.__fxAnim = null;
    }
    _removeClass(el, name + '-leave-active');
    _removeClass(el, name + '-leave-to');
    _clearState(el, st ? st.to : null);

    if (reduced()) {
      _clearState(el, st ? st.from : null);
      _removeClass(el, name + '-enter-active');
      _removeClass(el, name + '-enter-from');
      return;
    }

    _addClass(el, name + '-enter-active');

    if (hasAnimate() && el.animate && st) {
      /* 注意: 此时不能加 -enter-from 类 —— 它会把底层样式钉在起点值,
         空关键帧 {} 解析成"底层值"时就解析回起点值, 动画变成原地不动 */
      var a = el.animate([_kf(st.from), {}], { duration: dur, easing: ease });
      el.__fxAnim = a;
      a.onfinish = function () {
        _removeClass(el, name + '-enter-active');
        _removeClass(el, name + '-enter-from');
        if (el.__fxAnim === a) { el.__fxAnim = null; }
      };
      return;
    }

    /* 回退: 类 + 内联 (老浏览器 transition 引擎正常工作的场景) */
    _addClass(el, name + '-enter-from');
    _applyState(el, st ? st.from : null);
    _reflowAll(el);
    raf(function () {
      if (el.__fxGen !== gen) { return; }
      _clearState(el, st ? st.from : null);
      _removeClass(el, name + '-enter-from');
    });
    setTimeout(function () {
      if (el.__fxGen !== gen) { return; }
      _removeClass(el, name + '-enter-active');
    }, dur + 40);
  }

  /* 「离开」: 起点=自然状态, 终点=to 状态。
     播完 (dur) 后回调 onDone, 由调用方负责隐藏/移除节点
     (WAAPI fill:none 结束会回落到自然状态, 所以必须紧接着隐藏)。
     超时兜底防止标签页隐藏时 onfinish 不触发。 */
  function overlayLeave(el, name, onDone) {
    if (!el || !name) { if (onDone) { onDone(); } return; }
    var st = _OVERLAY_STATE[name];
    var dur = (st && st.dur) || 400;
    var ease = (st && st.ease) || EASE_SWIFT;
    var gen = (el.__fxGen = (el.__fxGen || 0) + 1);
    el.__fxLeaving = true;
    if (el.__fxAnim) {
      try { el.__fxAnim.cancel(); } catch (e2) { /* noop */ }
      el.__fxAnim = null;
    }
    _removeClass(el, name + '-enter-active');
    _removeClass(el, name + '-enter-from');
    _clearState(el, st ? st.from : null);

    if (reduced()) {
      el.__fxLeaving = false;
      _removeClass(el, name + '-leave-active');
      _removeClass(el, name + '-leave-to');
      _clearState(el, st ? st.to : null);
      if (onDone) { onDone(); }
      return;
    }

    _addClass(el, name + '-leave-active');

    function finish() {
      if (!el.__fxLeaving) { return; }
      el.__fxLeaving = false;
      _removeClass(el, name + '-leave-active');
      _removeClass(el, name + '-leave-to');
      _clearState(el, st ? st.to : null);
      if (onDone) { onDone(); }
    }

    if (hasAnimate() && el.animate && st) {
      var a = el.animate([{}, _kf(st.to)], { duration: dur, easing: ease });
      el.__fxAnim = a;
      a.onfinish = function () {
        if (el.__fxAnim === a) { el.__fxAnim = null; }
        finish();
      };
      setTimeout(function () {
        if (el.__fxAnim === a) {
          try { a.cancel(); } catch (e2) { /* noop */ }
          el.__fxAnim = null;
          finish();
        }
      }, dur + 60);
      return;
    }

    /* 回退: 类 + 内联 (-leave-to 类同理只给回退路径用,
       WAAPI 期间钉住终点值会让空关键帧解析失败) */
    _addClass(el, name + '-leave-to');
    _applyState(el, st ? st.to : null);
    _reflowAll(el);
    setTimeout(function () {
      if (el.__fxGen !== gen) { return; }
      finish();
    }, dur + 40);
  }

  /* 打开浮层: 同时清掉 hidden 属性与内联 display, 不依赖 CSS 优先级 */
  function overlayOpen(mask, panel, wrap, name) {
    if (!panel || !name) { return; }
    panel.__fxLeaving = false;
    if (wrap) { wrap.hidden = false; wrap.style.display = ''; wrap.style.pointerEvents = ''; }
    if (mask) { mask.hidden = false; mask.style.display = ''; }
    panel.hidden = false;
    panel.style.display = '';
    _removeClass(panel, name + '-leave-active');
    _removeClass(panel, name + '-leave-to');
    overlayEnter(mask, 'dialog-mask');
    overlayEnter(panel, name);
  }

  /* 关闭浮层: 动画结束后用内联 display:none + hidden 双保险。
     关闭期间禁掉 wrap 的点击, 防止重复触发。 */
  function overlayClose(mask, panel, wrap, name, onDone) {
    if (!panel || !name) { if (onDone) { onDone(); } return; }
    if (panel.__fxLeaving) { return; }
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

  /* ---- Message / Notification 命令式 API ---- */
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

  /* ============================================================
   * FLIP 位移: 复刻原站 Vue TransitionGroup 的 move 行为。
   * 列表变化前记录兄弟项位置, 变化后把偏移量写成内联 transform,
   * 加 -move 类 (其 transition 规则在动画包里), 下一帧清掉 transform
   * 让过渡补间回位。插入与移除两处都要做, 否则堆叠时会瞬移。
   * ============================================================ */
  function _flipPre(stack) {
    var out = [];
    var kids = stack.children;
    for (var i = 0; i < kids.length; i++) {
      out.push({ el: kids[i], top: kids[i].getBoundingClientRect().top });
    }
    return out;
  }

  function _flipPost(stack, name, data) {
    var moveClass = name + '-move';
    var movers = [];
    for (var i = 0; i < data.length; i++) {
      var el = data[i].el;
      if (!el.parentNode) { continue; }
      if (el.__fxLeaving) { continue; }
      var cls = el.className || '';
      if (cls.indexOf(moveClass) !== -1) { continue; }
      if (cls.indexOf(name + '-enter-active') !== -1) { continue; }
      var d = el.getBoundingClientRect().top - data[i].top;
      if (d === 0) { continue; }
      _addClass(el, moveClass);
      if (hasAnimate() && el.animate) {
        /* WAAPI 直接驱动位移, 不依赖 transition 引擎 */
        var a = el.animate(
          [{ transform: 'translateY(' + (-d) + 'px)' }, { transform: 'translateY(0px)' }],
          { duration: 400, easing: EASE_SWIFT }
        );
        (function (m) {
          a.onfinish = function () { _removeClass(m, moveClass); };
        })(el);
        setTimeout(function () { _removeClass(el, moveClass); }, 460);
      } else {
        el.style.webkitTransform = 'translateY(' + (-d) + 'px)';
        el.style.transform = 'translateY(' + (-d) + 'px)';
        movers.push(el);
      }
    }
    if (!movers.length) { return; }
    document.body.offsetWidth;
    raf(function () {
      for (var j = 0; j < movers.length; j++) {
        movers[j].style.webkitTransform = '';
        movers[j].style.transform = '';
      }
      setTimeout(function () {
        for (var k = 0; k < movers.length; k++) { _removeClass(movers[k], moveClass); }
      }, 460);
    });
  }

  /* 从堆栈中移除一项: leave 过渡 + 兄弟项 FLIP 位移 */
  function _flipDismiss(stack, el, name, onDone) {
    var pre = _flipPre(stack);
    overlayLeave(el, name, function () {
      if (el.parentNode) { el.parentNode.removeChild(el); }
      if (onDone) { onDone(); }
    });
    _flipPost(stack, name, pre);
  }

  /* ---- 图标: 原站用 lucide, 这里内联同路径 SVG ---- */
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

  /* MVAnim.message({ type, text, duration, closable, onRemove })
     结构与原站一致: 图标 + 14px/600 文本 + 可选关闭钮。默认 3s。 */
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

  /* MVAnim.notification({ side, type, title, text, duration, closable, onRemove })
     结构与原站一致: 18px 图标 + 13px/700 标题 + 12px 正文 + 关闭钮。默认 4s。 */
  function notification(opts) {
    opts = opts || {};
    var side = opts.side || 'right';
    var type = opts.type || 'info';
    var title = opts.title || '';
    var text = opts.text != null ? opts.text : (opts.message || '');
    var duration = opts.duration == null ? 4000 : opts.duration;
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
    /* 与原站一致: 新通知 push 到列表末尾 (底部堆栈里即最靠近屏幕角), 已有项整体上移 */
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
    closeAllNotifs: closeAllNotifs
  };
});

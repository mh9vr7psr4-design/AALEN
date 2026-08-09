(() => {
  "use strict";

  const root = document.documentElement;
  const scrollArea = document.getElementById("works-exhibit-scroll");
  const sticky = scrollArea?.querySelector(".works-exhibit__sticky");
  const scene = scrollArea?.querySelector(".works-exhibit__scene");
  const grid = scrollArea?.querySelector(".works-grid");
  const allCards = Array.from(grid?.querySelectorAll(".work-card") || []);
  const indexLabel = document.getElementById("works-exhibit-index");
  const titleLabel = document.getElementById("works-exhibit-title");
  const noteLabel = document.getElementById("works-exhibit-note");
  const hintLabel = document.getElementById("works-scroll-hint");
  const indicatorTrack = scrollArea?.querySelector(".works-depth-indicator__track");
  const indicatorBall = document.getElementById("works-depth-indicator-ball");
  const hud = scrollArea?.querySelector(".works-exhibit__hud");
  const controls = scrollArea?.querySelector(".works-loop-controls");
  const previousButton = document.getElementById("works-loop-prev");
  const nextButton = document.getElementById("works-loop-next");

  if (!scrollArea || !sticky || !scene || !grid || !allCards.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
  const pad = (value) => String(value).padStart(2, "0");
  const easeInOutCubic = (value) => value < .5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;

  const timings = {
    focus: reducedMotion ? 1 : 940,
    switch: reducedMotion ? 1 : 1040,
    release: reducedMotion ? 1 : 820,
    page: reducedMotion ? 1 : 920,
    storySwap: reducedMotion ? 1 : 250,
    storyRevealGap: reducedMotion ? 1 : 70,
    gestureGap: 120,
    gestureThreshold: 34
  };

  let cards = [];
  let activeIndex = 0;
  let stage = "rest";
  let stageDirection = 1;
  let autoAnimating = false;
  let queuedDirection = 0;
  let destroyed = false;
  let isPinned = false;
  let wasPinned = false;
  let sequenceToken = 0;
  let resizePending = false;
  let indicatorWidth = 0;

  let scrollFrame = 0;
  let resizeFrame = 0;
  let scrollAnimationFrame = 0;

  let wheelAccumulator = 0;
  let wheelDirection = 0;
  let wheelGestureConsumed = false;
  let lastWheelAt = 0;
  let wheelGestureTimer = 0;

  let touchCaptured = false;
  let touchStartY = 0;
  let touchStartAt = 0;

  const timers = new Set();

  const delay = (duration) => new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      resolve();
    }, reducedMotion ? 1 : duration);
    timers.add(timer);
  });

  const waitForMotion = (element, duration) => {
    if (!element || reducedMotion) return delay(1);
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        element.removeEventListener("transitionend", onTransitionEnd);
        window.clearTimeout(fallback);
        timers.delete(fallback);
        resolve();
      };
      const onTransitionEnd = (event) => {
        if (event.target === element && event.propertyName === "transform") finish();
      };
      element.addEventListener("transitionend", onTransitionEnd);
      const fallback = window.setTimeout(finish, duration + 180);
      timers.add(fallback);
    });
  };

  const cardHasPhoto = (card) => {
    const image = card.querySelector("[data-photo]");
    const media = card.querySelector("[data-image-slot]");
    return Boolean(media?.classList.contains("has-photo") && image && !image.hidden && image.getAttribute("src"));
  };

  const getMetrics = () => {
    const bounds = scrollArea.getBoundingClientRect();
    const travel = Math.max(1, scrollArea.offsetHeight - window.innerHeight);
    const progress = clamp(-bounds.top / travel);
    const pinned = bounds.top <= 1 && bounds.bottom >= window.innerHeight - 1;
    return { bounds, progress, pinned };
  };

  const getAreaTop = () => window.scrollY + scrollArea.getBoundingClientRect().top;

  const getRestOffset = () => {
    if (window.innerWidth <= 900) return Math.min(34, window.innerWidth * .075);
    return Math.min(280, window.innerWidth * .18);
  };

  const getTravelOffset = () => Math.max(460, window.innerWidth * .62);

  const setHint = (message) => {
    if (hintLabel) hintLabel.textContent = message;
  };

  const setBusy = (busy) => {
    sticky.setAttribute("aria-busy", String(busy));
  };

  const setCardVisual = (card, mode) => {
    if (!card) return;
    const restOffset = getRestOffset();
    const travelOffset = getTravelOffset();
    const states = {
      rest: { x: restOffset, y: 0, scale: 1, opacity: 1 },
      focus: { x: 0, y: window.innerWidth <= 900 ? 7 : 0, scale: 1.024, opacity: 1 },
      right: { x: travelOffset, y: 12, scale: .958, opacity: 0 },
      left: { x: -travelOffset, y: 9, scale: .944, opacity: 0 }
    };
    const visual = states[mode] || states.right;
    card.dataset.depthState = mode;
    card.style.setProperty("--depth-x", `${visual.x.toFixed(2)}px`);
    card.style.setProperty("--depth-y", `${visual.y.toFixed(2)}px`);
    card.style.setProperty("--depth-scale", visual.scale.toFixed(4));
    card.style.setProperty("--depth-opacity", visual.opacity.toFixed(4));
    card.style.setProperty("z-index", mode === "focus" ? "960" : mode === "rest" ? "940" : "900");
  };

  const measureIndicator = () => {
    indicatorWidth = Math.max(0, indicatorTrack?.clientWidth || 0);
  };

  const syncIndicator = () => {
    if (!indicatorTrack || !indicatorBall) return;
    if (!indicatorWidth) measureIndicator();
    const progress = cards.length > 1 ? activeIndex / (cards.length - 1) : 0;
    const x = Math.max(0, indicatorWidth - 12) * progress;
    indicatorTrack.style.setProperty("--indicator-progress", progress.toFixed(4));
    indicatorBall.style.setProperty("--indicator-x", `${x.toFixed(2)}px`);
  };

  const updateInteractivity = () => {
    cards.forEach((card, index) => {
      const interactive = index === activeIndex
        && !autoAnimating
        && (cardHasPhoto(card) || root.classList.contains("editing"));
      card.style.setProperty("pointer-events", interactive ? "auto" : "none");
      card.setAttribute("aria-hidden", String(index !== activeIndex));
      const media = card.querySelector("[data-image-slot]");
      if (!media) return;
      if (interactive && cardHasPhoto(card)) media.setAttribute("aria-current", "true");
      else media.removeAttribute("aria-current");
    });
  };

  const updateHud = (nextIndex) => {
    activeIndex = clamp(nextIndex, 0, Math.max(0, cards.length - 1));
    const activeCard = cards[activeIndex];
    const title = activeCard?.dataset.exhibitTitle || "";
    const note = activeCard?.dataset.exhibitNote || "";

    allCards.forEach((card) => {
      const isActive = card === activeCard;
      card.toggleAttribute("data-exhibit-active", isActive);
      card.toggleAttribute("data-depth-current", isActive);
    });

    if (indexLabel) indexLabel.textContent = `${pad(activeIndex + 1)} / ${pad(cards.length)}`;
    if (titleLabel) titleLabel.textContent = title;
    if (noteLabel) noteLabel.textContent = note;
    syncIndicator();

    const progress = cards.length > 1 ? activeIndex / (cards.length - 1) : 0;
    sticky.style.setProperty("--works-progress", progress.toFixed(4));
    scene.style.setProperty("--depth-phase", String(activeIndex));
    controls?.style.setProperty("--works-progress", progress.toFixed(4));
    hud?.setAttribute("data-scroll-state", `TWO STEP · ${pad(activeIndex + 1)}`);
    updateInteractivity();
  };

  const renderRest = ({ initialize = false, keepQueue = false } = {}) => {
    sequenceToken += 1;
    autoAnimating = false;
    if (!keepQueue) queuedDirection = 0;
    setBusy(false);

    if (initialize) sticky.classList.add("is-initializing");
    sticky.classList.remove("is-stage-focused", "is-copy-hidden", "is-switching", "is-releasing");

    cards.forEach((card, index) => {
      card.removeAttribute("data-depth-outgoing");
      card.removeAttribute("data-depth-incoming");
      setCardVisual(card, index < activeIndex ? "left" : index === activeIndex ? "rest" : "right");
    });

    allCards.filter((card) => !cards.includes(card)).forEach((card) => {
      card.removeAttribute("data-exhibit-active");
      card.removeAttribute("data-depth-current");
      card.removeAttribute("data-depth-outgoing");
      card.removeAttribute("data-depth-incoming");
      setCardVisual(card, "right");
      card.style.setProperty("pointer-events", "none");
      card.setAttribute("aria-hidden", "true");
    });

    updateHud(activeIndex);
    setHint("轻滚一次 · 先聚焦当前作品");
    stage = "rest";
    stageDirection = 1;

    if (initialize) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => sticky.classList.remove("is-initializing"));
      });
    }
  };

  const drainQueuedStage = () => {
    if (!queuedDirection || autoAnimating || destroyed || stage === "releasing") return;
    const direction = queuedDirection;
    queuedDirection = 0;
    window.requestAnimationFrame(() => {
      if (!destroyed && !autoAnimating) triggerStage(direction);
    });
  };

  const finishAction = (token, nextStage) => {
    if (destroyed || token !== sequenceToken) return;
    autoAnimating = false;
    stage = nextStage;
    setBusy(false);
    updateInteractivity();

    if (resizePending) {
      resizePending = false;
      measureIndicator();
      renderRest({ initialize: true, keepQueue: true });
    }
    drainQueuedStage();
  };

  const focusCurrent = async (direction) => {
    if (autoAnimating || !cards.length) return;
    const token = ++sequenceToken;
    autoAnimating = true;
    setBusy(true);
    stageDirection = direction;
    sticky.classList.add("is-stage-focused", "is-copy-hidden");
    setHint(direction > 0 ? "再次轻滚 · 前往下一组" : "再次轻滚 · 返回上一组");
    setCardVisual(cards[activeIndex], "focus");
    updateInteractivity();

    await waitForMotion(cards[activeIndex], timings.focus);
    if (destroyed || token !== sequenceToken) return;
    finishAction(token, "focused");
  };

  const returnToRest = async () => {
    if (autoAnimating || !cards.length) return;
    const token = ++sequenceToken;
    autoAnimating = true;
    setBusy(true);
    sticky.classList.remove("is-stage-focused", "is-copy-hidden");
    setCardVisual(cards[activeIndex], "rest");
    setHint("正在返回当前作品");
    updateInteractivity();

    await waitForMotion(cards[activeIndex], timings.focus);
    if (destroyed || token !== sequenceToken) return;
    setHint("轻滚一次 · 先聚焦当前作品");
    finishAction(token, "rest");
  };

  const smoothWindowScroll = (to, duration = timings.page) => new Promise((resolve) => {
    window.cancelAnimationFrame(scrollAnimationFrame);
    const from = window.scrollY;
    const distance = to - from;
    const startedAt = performance.now();

    const step = (time) => {
      if (destroyed) return;
      const progress = clamp((time - startedAt) / Math.max(1, duration));
      window.scrollTo(0, from + distance * (reducedMotion ? 1 : easeInOutCubic(progress)));
      if (progress < 1) {
        scrollAnimationFrame = window.requestAnimationFrame(step);
        return;
      }
      scrollAnimationFrame = 0;
      resolve();
    };

    scrollAnimationFrame = window.requestAnimationFrame(step);
  });

  const releasePassage = async (direction) => {
    if (autoAnimating || !cards.length) return;
    const token = ++sequenceToken;
    autoAnimating = true;
    stage = "releasing";
    queuedDirection = 0;
    setBusy(true);
    sticky.classList.add("is-switching", "is-releasing", "is-copy-hidden");

    const currentCard = cards[activeIndex];
    currentCard?.setAttribute("data-depth-outgoing", "");
    setCardVisual(currentCard, direction > 0 ? "left" : "right");
    setHint(direction > 0 ? "作品浏览完成 · 继续向下" : "返回作品开篇");
    updateInteractivity();

    await waitForMotion(currentCard, timings.release);
    if (destroyed || token !== sequenceToken) return;

    root.classList.remove("works-scroll-engaged");
    const areaTop = getAreaTop();
    const target = direction > 0
      ? areaTop + scrollArea.offsetHeight + 2
      : Math.max(0, areaTop - Math.min(window.innerHeight * .72, 680));
    await smoothWindowScroll(target);
    if (destroyed || token !== sequenceToken) return;

    currentCard?.removeAttribute("data-depth-outgoing");
    sticky.classList.remove("is-switching", "is-releasing", "is-stage-focused", "is-copy-hidden");
    autoAnimating = false;
    stage = "rest";
    setBusy(false);
    isPinned = false;
    wasPinned = false;
    renderRest({ initialize: true });
  };

  const switchWork = async (direction) => {
    if (autoAnimating || !cards.length) return;
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= cards.length) {
      await releasePassage(direction);
      return;
    }

    const token = ++sequenceToken;
    autoAnimating = true;
    stage = "switching";
    setBusy(true);
    sticky.classList.add("is-switching", "is-stage-focused", "is-copy-hidden");

    const outgoing = cards[activeIndex];
    const incoming = cards[nextIndex];
    outgoing.setAttribute("data-depth-outgoing", "");
    incoming.setAttribute("data-depth-incoming", "");
    updateInteractivity();

    const outgoingMotion = waitForMotion(outgoing, timings.switch);
    const incomingMotion = waitForMotion(incoming, timings.switch);
    window.requestAnimationFrame(() => {
      setCardVisual(outgoing, direction > 0 ? "left" : "right");
      setCardVisual(incoming, "rest");
    });

    const storySwap = (async () => {
      await delay(timings.storySwap);
      if (destroyed || token !== sequenceToken) return;
      updateHud(nextIndex);
      await delay(timings.storyRevealGap);
      if (destroyed || token !== sequenceToken) return;
      sticky.classList.remove("is-copy-hidden");
      setHint("下一组正在进入");
    })();

    await Promise.all([outgoingMotion, incomingMotion, storySwap]);
    if (destroyed || token !== sequenceToken) return;

    outgoing.removeAttribute("data-depth-outgoing");
    incoming.removeAttribute("data-depth-incoming");
    sticky.classList.remove("is-switching", "is-stage-focused");
    setHint("轻滚一次 · 先聚焦当前作品");
    finishAction(token, "rest");
  };

  function triggerStage(direction) {
    if (!cards.length || destroyed || stage === "releasing") return;
    if (autoAnimating) {
      queuedDirection = direction;
      return;
    }
    if (stage === "rest") {
      focusCurrent(direction);
      return;
    }
    if (stage === "focused") {
      if (direction === stageDirection) switchWork(direction);
      else returnToRest();
    }
  }

  const queueStage = (direction) => {
    if (stage === "releasing") return;
    if (autoAnimating) {
      queuedDirection = direction;
      setHint("已接收下一次滚动");
      return;
    }
    triggerStage(direction);
  };

  const normaliseWheelDelta = (event) => {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  };

  const resetWheelGesture = () => {
    wheelAccumulator = 0;
    wheelDirection = 0;
    wheelGestureConsumed = false;
  };

  const onWheel = (event) => {
    if (destroyed || root.classList.contains("gallery-page-open") || root.classList.contains("lightbox-open")) return;
    if (root.classList.contains("editing") || !isPinned) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.preventDefault();
    const delta = normaliseWheelDelta(event);
    if (Math.abs(delta) < .5) return;

    const now = performance.now();
    if (now - lastWheelAt > timings.gestureGap) resetWheelGesture();
    lastWheelAt = now;

    const direction = delta > 0 ? 1 : -1;
    if (wheelDirection && direction !== wheelDirection) {
      wheelAccumulator = 0;
    }
    wheelDirection = direction;
    wheelAccumulator += delta;

    window.clearTimeout(wheelGestureTimer);
    wheelGestureTimer = window.setTimeout(resetWheelGesture, timings.gestureGap);

    if (wheelGestureConsumed || Math.abs(wheelAccumulator) < timings.gestureThreshold) return;
    wheelGestureConsumed = true;
    wheelAccumulator = 0;
    queueStage(direction);
  };

  const onScroll = () => {
    if (scrollFrame || destroyed) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      const metrics = getMetrics();
      isPinned = metrics.pinned;
      root.classList.toggle("works-scroll-engaged", isPinned);

      if (isPinned && !wasPinned && !autoAnimating && !root.classList.contains("editing")) {
        activeIndex = metrics.progress > .55 ? cards.length - 1 : 0;
        renderRest({ initialize: true });
      }
      wasPinned = isPinned;
    });
  };

  const refreshCards = ({ keepCurrent = true } = {}) => {
    const editing = root.classList.contains("editing");
    const currentCard = cards[activeIndex];
    cards = allCards.filter((card) => editing || cardHasPhoto(card));
    if (!cards.length) cards = allCards.slice(0, 1);
    const retainedIndex = keepCurrent && currentCard ? cards.indexOf(currentCard) : -1;
    activeIndex = retainedIndex >= 0 ? retainedIndex : clamp(activeIndex, 0, cards.length - 1);
    measureIndicator();
    renderRest({ initialize: true });
    const metrics = getMetrics();
    isPinned = metrics.pinned;
    wasPinned = isPinned;
    root.classList.toggle("works-scroll-engaged", isPinned);
  };

  previousButton?.addEventListener("click", () => queueStage(-1));
  nextButton?.addEventListener("click", () => queueStage(1));

  sticky.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch || root.classList.contains("editing")) return;
    touchCaptured = isPinned;
    touchStartY = touch.clientY;
    touchStartAt = performance.now();
  }, { passive: true });

  sticky.addEventListener("touchmove", (event) => {
    if (touchCaptured && isPinned && !root.classList.contains("editing")) event.preventDefault();
  }, { passive: false });

  sticky.addEventListener("touchend", (event) => {
    if (!touchCaptured || root.classList.contains("editing")) return;
    touchCaptured = false;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const delta = touchStartY - touch.clientY;
    const elapsed = performance.now() - touchStartAt;
    if (Math.abs(delta) < 34 || elapsed > 1300) return;
    queueStage(delta > 0 ? 1 : -1);
  }, { passive: true });

  sticky.addEventListener("touchcancel", () => {
    touchCaptured = false;
  }, { passive: true });

  window.addEventListener("keydown", (event) => {
    if (!isPinned || root.classList.contains("editing")) return;
    const forward = event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ";
    const backward = event.key === "ArrowUp" || event.key === "PageUp";
    if (!forward && !backward) return;
    event.preventDefault();
    queueStage(forward ? 1 : -1);
  });

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  const onViewportChange = () => {
    if (resizeFrame || destroyed) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      measureIndicator();
      syncIndicator();
      if (autoAnimating) resizePending = true;
      else renderRest({ initialize: true });
    });
  };
  window.addEventListener("resize", onViewportChange, { passive: true });
  window.addEventListener("orientationchange", onViewportChange, { passive: true });

  let observedEditingState = root.classList.contains("editing");
  const editingObserver = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.attributeName === "class")) return;
    const nextEditingState = root.classList.contains("editing");
    if (nextEditingState === observedEditingState) return;
    observedEditingState = nextEditingState;
    refreshCards({ keepCurrent: false });
  });
  editingObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

  window.addEventListener("pagehide", () => {
    destroyed = true;
    sequenceToken += 1;
    timers.forEach((timer) => window.clearTimeout(timer));
    timers.clear();
    window.clearTimeout(wheelGestureTimer);
    window.cancelAnimationFrame(scrollFrame);
    window.cancelAnimationFrame(resizeFrame);
    window.cancelAnimationFrame(scrollAnimationFrame);
    editingObserver.disconnect();
    root.classList.remove("works-scroll-engaged");
  }, { once: true });

  refreshCards({ keepCurrent: false });
})();

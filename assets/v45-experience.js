"use strict";
(() => {
  // source-site/assets/spatial-motion.js
  (() => {
    "use strict";
    const root = document.documentElement;
    if (root.dataset.spatialMotion === "v3") return;
    root.dataset.spatialMotion = "v3";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const memory = Number(navigator.deviceMemory || 8);
    const cores = Number(navigator.hardwareConcurrency || 8);
    const lowTier = Boolean(connection?.saveData) || memory <= 4 || cores <= 4;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    root.classList.add(lowTier ? "spatial-tier-low" : "spatial-tier-high", "spatial-v3");
    document.querySelectorAll("img, .media, .work-card").forEach((element) => {
      if (element.tagName === "IMG") element.draggable = false;
    });
    const groups = [
      ["#about", ".about__visual, .about__copy"],
      ["#works", ".works .section-heading"],
      [".manifesto", ".manifesto__inner"],
      ["#booking", ".booking .section-heading, .booking-step"],
      ["#service-intro", ".service-intro__header, .service-journey, .service-ball-code-slot, .service-plan, .service-basics, .service-disclosures"],
      ["#contact", ".contact__lead, .contact-grid > div, .contact-copy-picker, .site-footer"]
    ];
    const stages = [];
    groups.forEach(([sectionSelector, itemSelector], sectionIndex) => {
      const section = document.querySelector(sectionSelector);
      if (!section) return;
      section.classList.add("spatial-section-v3");
      const items = Array.from(document.querySelectorAll(itemSelector));
      items.forEach((item, itemIndex) => {
        item.dataset.spatialStage = String(sectionIndex);
        item.style.setProperty("--stage-delay", `${Math.min(itemIndex * 78, 312)}ms`);
        item.style.setProperty("--stage-depth", String(1 + itemIndex % 3 * 0.12));
        stages.push(item);
      });
    });
    const reveal = (item) => {
      if (item.classList.contains("is-spatial-visible")) return;
      item.classList.add("is-spatial-visible", "is-spatial-moving");
      window.setTimeout(() => item.classList.remove("is-spatial-moving"), lowTier ? 650 : 1050);
    };
    if (reduceMotion || !("IntersectionObserver" in window)) {
      stages.forEach(reveal);
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -7% 0px", threshold: 0.035 });
      stages.forEach((item) => observer.observe(item));
    }
    const hero = document.getElementById("top");
    let pointerFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const renderPointer = () => {
      pointerFrame = 0;
      if (!hero || root.classList.contains("gallery-page-open")) return;
      hero.style.setProperty("--hero-parallax-x", `${pointerX.toFixed(2)}px`);
      hero.style.setProperty("--hero-parallax-y", `${pointerY.toFixed(2)}px`);
    };
    if (!reduceMotion && !lowTier && finePointer && hero) {
      hero.addEventListener("pointermove", (event) => {
        const bounds = hero.getBoundingClientRect();
        pointerX = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * -8;
        pointerY = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * -5;
        if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
      }, { passive: true });
      hero.addEventListener("pointerleave", () => {
        pointerX = 0;
        pointerY = 0;
        if (!pointerFrame) pointerFrame = window.requestAnimationFrame(renderPointer);
      }, { passive: true });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && pointerFrame) {
        window.cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
      }
    }, { passive: true });
  })();

  // source-site/assets/v44-hover-depth-effects.js
  (() => {
    "use strict";
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileViewport = window.matchMedia("(max-width: 900px)");
    const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
    const opening = document.getElementById("opening-ink");
    const legacyIntro = document.getElementById("intro");
    if (opening) {
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        opening.classList.add("is-leaving");
      };
      if (!root.classList.contains("intro-lock")) {
        window.setTimeout(release, reducedMotion ? 20 : 360);
      } else if ("MutationObserver" in window) {
        const observer = new MutationObserver(() => {
          if (root.classList.contains("intro-lock") && !legacyIntro?.classList.contains("is-leaving")) return;
          observer.disconnect();
          release();
        });
        observer.observe(root, { attributes: true, attributeFilter: ["class"] });
        if (legacyIntro) observer.observe(legacyIntro, { attributes: true, attributeFilter: ["class"] });
        window.setTimeout(() => {
          observer.disconnect();
          release();
        }, reducedMotion ? 500 : 6200);
      } else {
        window.setTimeout(release, reducedMotion ? 120 : 3200);
      }
    }
    const worksGrid = document.querySelector("#works .works-grid");
    let workCards = Array.from(worksGrid?.querySelectorAll(".work-card") || []);
    const observedRatioImages = /* @__PURE__ */ new WeakSet();
    let ratioFrame = 0;
    let refreshStepRail = () => {
    };
    const getDimensions = (image) => {
      const naturalWidth = Number(image?.naturalWidth);
      const naturalHeight = Number(image?.naturalHeight);
      const attributeWidth = Number(image?.getAttribute("width"));
      const attributeHeight = Number(image?.getAttribute("height"));
      const width = naturalWidth > 0 ? naturalWidth : attributeWidth;
      const height = naturalHeight > 0 ? naturalHeight : attributeHeight;
      return width > 0 && height > 0 ? { width, height } : null;
    };
    const syncCardRatio = (card) => {
      const image = card.querySelector("[data-photo]");
      const media = card.querySelector("[data-image-slot]");
      const dimensions = getDimensions(image);
      if (!media || !dimensions) return;
      const { width, height } = dimensions;
      const ratio = width / height;
      const orientation = ratio > 1.08 ? "landscape" : ratio < 0.92 ? "portrait" : "square";
      const mobile = mobileViewport.matches;
      const shortViewport = window.innerHeight < 680;
      const imageHeightShare = mobile ? shortViewport ? 0.42 : orientation === "landscape" ? 0.43 : 0.51 : orientation === "landscape" ? 0.56 : 0.68;
      const heightBound = window.innerHeight * imageHeightShare * ratio + (mobile ? 18 : 28);
      const viewportBound = window.innerWidth * (mobile ? orientation === "landscape" ? 0.92 : orientation === "square" ? 0.82 : 0.84 : orientation === "landscape" ? 0.42 : orientation === "square" ? 0.38 : 0.31);
      const absoluteCap = mobile ? orientation === "landscape" ? 520 : orientation === "square" ? 440 : 430 : orientation === "landscape" ? 760 : orientation === "square" ? 620 : 500;
      const responsiveWidth = Math.max(156, Math.min(heightBound, viewportBound, absoluteCap));
      const focusHeightShare = mobile ? shortViewport ? 0.6 : 0.68 : 0.7;
      const focusViewportBound = window.innerWidth * (mobile ? 0.92 : 0.7);
      const focusHeightBound = window.innerHeight * focusHeightShare * ratio + (mobile ? 18 : 28);
      const focusAbsoluteCap = mobile ? 720 : 1600;
      const focusWidth = Math.max(responsiveWidth, Math.min(focusViewportBound, focusHeightBound, focusAbsoluteCap));
      card.dataset.workOrientation = orientation;
      card.style.setProperty("--work-aspect", ratio.toFixed(5));
      card.style.setProperty("--work-responsive-width", `${responsiveWidth.toFixed(2)}px`);
      card.style.setProperty("--work-focus-width", `${focusWidth.toFixed(2)}px`);
      media.style.setProperty("--work-ratio", `${width} / ${height}`);
    };
    const syncAllRatios = () => {
      ratioFrame = 0;
      workCards.forEach(syncCardRatio);
    };
    const scheduleRatioSync = () => {
      if (!ratioFrame) ratioFrame = window.requestAnimationFrame(syncAllRatios);
    };
    const syncWorkCards = () => {
      workCards = Array.from(worksGrid?.querySelectorAll(".work-card") || []);
      workCards.forEach((card) => {
        const image = card.querySelector("[data-photo]");
        if (!image || observedRatioImages.has(image)) return;
        observedRatioImages.add(image);
        image.addEventListener("load", () => syncCardRatio(card), { passive: true });
      });
    };
    syncWorkCards();
    syncAllRatios();
    window.addEventListener("resize", scheduleRatioSync, { passive: true });
    window.addEventListener("orientationchange", scheduleRatioSync, { passive: true });
    const ratioObserver = worksGrid && "MutationObserver" in window ? new MutationObserver(() => {
      syncWorkCards();
      refreshStepRail();
      scheduleRatioSync();
    }) : null;
    ratioObserver?.observe(worksGrid, {
      attributes: true,
      attributeFilter: ["src", "width", "height", "hidden", "data-exhibit-active"],
      childList: true,
      subtree: true
    });
    const stepRail = document.querySelector("#works .works-step-rail");
    if (stepRail) {
      stepRail.setAttribute("aria-hidden", "true");
      refreshStepRail = () => {
        const populatedCards = workCards.filter((card) => {
          const image = card.querySelector("[data-photo]");
          return image && !image.hidden && image.getAttribute("src");
        });
        if (stepRail.children.length !== populatedCards.length) {
          stepRail.replaceChildren(...populatedCards.map(() => document.createElement("i")));
        }
        const active = populatedCards.findIndex((card) => card.hasAttribute("data-exhibit-active"));
        Array.from(stepRail.children).forEach((dot, index) => dot.classList.toggle("is-active", index === active));
      };
      refreshStepRail();
    }
    const handleWorksChanged = () => {
      syncWorkCards();
      refreshStepRail();
      syncAllRatios();
    };
    window.addEventListener("len:works-changed", handleWorksChanged);
    const sticky = document.querySelector("#works .works-exhibit__sticky");
    let auraFrame = 0;
    if (sticky) {
      let gesturePointer = null;
      let hoverPointer = null;
      let lastPulseAt = 0;
      let lastPulseX = 0;
      let lastPulseY = 0;
      let auraX = 0;
      let auraY = 0;
      const locate = (clientX, clientY) => {
        const bounds = sticky.getBoundingClientRect();
        return {
          x: clamp(clientX - bounds.left, 0, bounds.width),
          y: clamp(clientY - bounds.top, 0, bounds.height)
        };
      };
      const paintAura = () => {
        auraFrame = 0;
        sticky.style.setProperty("--gesture-x", `${auraX.toFixed(2)}px`);
        sticky.style.setProperty("--gesture-y", `${auraY.toFixed(2)}px`);
      };
      const moveAura = (event) => {
        const point = locate(event.clientX, event.clientY);
        auraX = point.x;
        auraY = point.y;
        if (!auraFrame) auraFrame = window.requestAnimationFrame(paintAura);
      };
      const pulse = (event) => {
        const point = locate(event.clientX, event.clientY);
        const light = document.createElement("i");
        light.className = "gesture-light-pulse";
        light.setAttribute("aria-hidden", "true");
        light.style.setProperty("--pulse-x", `${point.x.toFixed(2)}px`);
        light.style.setProperty("--pulse-y", `${point.y.toFixed(2)}px`);
        sticky.append(light);
        const remove = () => light.remove();
        light.addEventListener("animationend", remove, { once: true });
        window.setTimeout(remove, reducedMotion ? 60 : 1250);
        lastPulseAt = performance.now();
        lastPulseX = point.x;
        lastPulseY = point.y;
      };
      const maybePulse = (event) => {
        const point = locate(event.clientX, event.clientY);
        const elapsed = performance.now() - lastPulseAt;
        const distance = Math.hypot(point.x - lastPulseX, point.y - lastPulseY);
        if (elapsed >= 980 && distance >= 90) pulse(event);
      };
      sticky.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "touch") return;
        hoverPointer = event.pointerId;
        moveAura(event);
        pulse(event);
        sticky.classList.add("is-gesture-active");
      }, { passive: true });
      sticky.addEventListener("pointermove", (event) => {
        const hovering = event.pointerType !== "touch" && event.pointerId === hoverPointer;
        const touching = event.pointerId === gesturePointer;
        if (!hovering && !touching) return;
        moveAura(event);
        maybePulse(event);
      }, { passive: true });
      sticky.addEventListener("pointerleave", (event) => {
        if (event.pointerType === "touch" || event.pointerId !== hoverPointer) return;
        hoverPointer = null;
        if (gesturePointer === null) sticky.classList.remove("is-gesture-active");
      }, { passive: true });
      sticky.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch") return;
        gesturePointer = event.pointerId;
        moveAura(event);
        pulse(event);
        sticky.classList.add("is-gesture-active");
      }, { passive: true });
      const releaseAura = (event) => {
        if (event.pointerId !== gesturePointer) return;
        gesturePointer = null;
        if (hoverPointer === null) sticky.classList.remove("is-gesture-active");
      };
      sticky.addEventListener("pointerup", releaseAura, { passive: true });
      sticky.addEventListener("pointercancel", releaseAura, { passive: true });
    }
    const addInkInteraction = (targets, tone) => {
      const kind = tone === "brown" ? "brown" : "black";
      const hoverState = /* @__PURE__ */ new WeakMap();
      const diffuse = (target, clientX, clientY) => {
        if (!target || root.classList.contains("editing")) return;
        const bounds = target.getBoundingClientRect();
        const x = Number.isFinite(clientX) ? clamp(clientX - bounds.left, 0, bounds.width) : bounds.width / 2;
        const y = Number.isFinite(clientY) ? clamp(clientY - bounds.top, 0, bounds.height) : bounds.height / 2;
        const diagonal = Math.hypot(bounds.width, bounds.height);
        const size = Math.min(1900, Math.max(420, diagonal * 1.95));
        const ripple = document.createElement("i");
        ripple.className = `ink-ripple ink-ripple--${kind}`;
        ripple.setAttribute("aria-hidden", "true");
        ripple.style.setProperty("--ink-x", `${x.toFixed(2)}px`);
        ripple.style.setProperty("--ink-y", `${y.toFixed(2)}px`);
        ripple.style.setProperty("--ink-size", `${size.toFixed(2)}px`);
        const existing = Array.from(target.children).filter((child) => child.classList.contains("ink-ripple"));
        const maximumLayers = 2;
        while (existing.length >= maximumLayers) existing.shift()?.remove();
        target.append(ripple);
        const remove = () => ripple.remove();
        ripple.addEventListener("animationend", (animationEvent) => {
          if (animationEvent.target !== ripple || animationEvent.pseudoElement) return;
          remove();
        });
        window.setTimeout(remove, reducedMotion ? 80 : 1650);
      };
      const diffuseOnMovement = (target, event, force = false) => {
        const bounds = target.getBoundingClientRect();
        const x = clamp(event.clientX - bounds.left, 0, bounds.width);
        const y = clamp(event.clientY - bounds.top, 0, bounds.height);
        const previous = hoverState.get(target) || { at: 0, x, y };
        const elapsed = performance.now() - previous.at;
        const distance = Math.hypot(x - previous.x, y - previous.y);
        const minimumInterval = 820;
        const minimumDistance = 64;
        if (!force && (elapsed < minimumInterval || distance < minimumDistance)) return;
        hoverState.set(target, { at: performance.now(), x, y });
        diffuse(target, event.clientX, event.clientY);
      };
      targets.forEach((target) => {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "0");
        target.addEventListener("pointerenter", (event) => {
          if (event.pointerType === "touch") return;
          diffuseOnMovement(target, event, true);
        }, { passive: true });
        target.addEventListener("pointermove", (event) => {
          if (event.pointerType === "touch") return;
          diffuseOnMovement(target, event);
        }, { passive: true });
        target.addEventListener("pointerdown", (event) => {
          if (event.pointerType !== "touch" && kind !== "brown") return;
          diffuseOnMovement(target, event, true);
        }, { passive: true });
        if (!("PointerEvent" in window)) {
          target.addEventListener("touchstart", (event) => {
            const touch = event.changedTouches?.[0];
            if (!touch) return;
            diffuse(target, touch.clientX, touch.clientY);
          }, { passive: true });
        }
        target.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          diffuse(target, NaN, NaN);
        });
      });
    };
    const planTargets = Array.from(document.querySelectorAll([
      "#service-intro .service-intro__header",
      "#service-intro .service-journey article",
      "#service-intro .service-plan",
      "#service-intro .service-basics"
    ].join(",")));
    addInkInteraction(planTargets, "brown");
    const warmBrownPlanInk = () => {
      const target = planTargets[0];
      if (!target) return;
      const sample = document.createElement("i");
      sample.className = "ink-ripple ink-ripple--brown";
      sample.setAttribute("aria-hidden", "true");
      sample.style.visibility = "hidden";
      sample.style.setProperty("animation", "none", "important");
      sample.style.setProperty("--ink-size", "620px");
      target.append(sample);
      window.getComputedStyle(sample).backgroundImage;
      window.getComputedStyle(sample).filter;
      window.getComputedStyle(sample, "::before").filter;
      sample.remove();
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(warmBrownPlanInk, { timeout: 1200 });
    } else {
      window.setTimeout(warmBrownPlanInk, 80);
    }
    const aboutTouchTimers = /* @__PURE__ */ new WeakMap();
    const activateAboutItem = (item, duration = 0) => {
      if (!item) return;
      const previousTimer = aboutTouchTimers.get(item);
      if (previousTimer) window.clearTimeout(previousTimer);
      item.classList.add("is-v43-about-touch");
      if (!duration) return;
      const timer = window.setTimeout(() => {
        item.classList.remove("is-v43-about-touch");
        aboutTouchTimers.delete(item);
      }, reducedMotion ? 80 : duration);
      aboutTouchTimers.set(item, timer);
    };
    const handleAboutPointerDown = (event) => {
      const item = event.target.closest?.("#about .about__copy [data-edit], .about-letter-preview .about__copy [data-edit]");
      if (!item) return;
      item.classList.remove("is-v43-about-touch");
      window.requestAnimationFrame(() => activateAboutItem(item, 820));
    };
    const handleAboutPointerOver = (event) => {
      if (event.pointerType === "touch") return;
      const item = event.target.closest?.("#about .about__copy [data-edit], .about-letter-preview .about__copy [data-edit]");
      activateAboutItem(item);
    };
    const handleAboutPointerOut = (event) => {
      if (event.pointerType === "touch") return;
      const item = event.target.closest?.("#about .about__copy [data-edit], .about-letter-preview .about__copy [data-edit]");
      if (!item || item.contains(event.relatedTarget)) return;
      item.classList.remove("is-v43-about-touch");
    };
    const handleAboutTouchStart = (event) => {
      const item = event.target.closest?.("#about .about__copy [data-edit], .about-letter-preview .about__copy [data-edit]");
      activateAboutItem(item, 820);
    };
    document.addEventListener("pointerdown", handleAboutPointerDown, { passive: true });
    document.addEventListener("pointerover", handleAboutPointerOver, { passive: true });
    document.addEventListener("pointerout", handleAboutPointerOut, { passive: true });
    if (!("PointerEvent" in window)) {
      document.addEventListener("touchstart", handleAboutTouchStart, { passive: true });
    }
    window.addEventListener("pagehide", () => {
      window.cancelAnimationFrame(auraFrame);
      window.cancelAnimationFrame(ratioFrame);
      ratioObserver?.disconnect();
      window.removeEventListener("len:works-changed", handleWorksChanged);
      document.removeEventListener("pointerdown", handleAboutPointerDown);
      document.removeEventListener("pointerover", handleAboutPointerOver);
      document.removeEventListener("pointerout", handleAboutPointerOut);
      document.removeEventListener("touchstart", handleAboutTouchStart);
    }, { once: true });
  })();

  // source-site/assets/v43-works-exhibit.js
  (() => {
    "use strict";
    const root = document.documentElement;
    const scrollArea = document.getElementById("works-exhibit-scroll");
    const sticky = scrollArea?.querySelector(".works-exhibit__sticky");
    const scene = scrollArea?.querySelector(".works-exhibit__scene");
    const grid = scrollArea?.querySelector(".works-grid");
    let allCards = Array.from(grid?.querySelectorAll(".work-card") || []);
    const indexLabel = document.getElementById("works-exhibit-index");
    const titleLabel = document.getElementById("works-exhibit-title");
    const noteLabel = document.getElementById("works-exhibit-note");
    const hintLabel = document.getElementById("works-scroll-hint");
    const indicatorTrack = scrollArea?.querySelector(".works-depth-indicator__track");
    const indicatorBall = document.getElementById("works-depth-indicator-ball");
    const hud = scrollArea?.querySelector(".works-exhibit__hud");
    const controls = scrollArea?.querySelector(".works-loop-controls");
    const controlsStatus = controls?.querySelector("[data-works-control-status]");
    const previousButton = document.getElementById("works-loop-prev");
    const nextButton = document.getElementById("works-loop-next");
    if (!scrollArea || !sticky || !scene || !grid || !allCards.length) return;
    if (window.matchMedia("(max-width: 900px)").matches) {
      root.classList.add("v45-native-works");
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileViewport = window.matchMedia("(max-width: 900px)");
    const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
    const pad = (value) => String(value).padStart(2, "0");
    const isMobileViewport = () => mobileViewport.matches;
    const cubicBezier = (x1, y1, x2, y2) => {
      const sample = (t, a1, a2) => ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
      const slope = (t, a1, a2) => 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
      return (value) => {
        let t = clamp(value);
        for (let iteration = 0; iteration < 5; iteration += 1) {
          const currentSlope = slope(t, x1, x2);
          if (Math.abs(currentSlope) < 1e-6) break;
          t = clamp(t - (sample(t, x1, x2) - value) / currentSlope);
        }
        return sample(t, y1, y2);
      };
    };
    const passageEase = cubicBezier(0.16, 0.84, 0.18, 1);
    const handoffDepartureEase = cubicBezier(0.42, 0, 0.3, 1);
    const handoffArrivalEase = cubicBezier(0.24, 0.42, 0.2, 1);
    const timings = {
      entry: reducedMotion ? 1 : 860,
      focus: reducedMotion ? 1 : 1120,
      switch: reducedMotion ? 1 : 1180,
      release: reducedMotion ? 1 : 920,
      page: reducedMotion ? 1 : 1040,
      storySwap: reducedMotion ? 1 : 515,
      settle: reducedMotion ? 1 : 72,
      /* One physical wheel gesture must equal one state change. A longer gap
         prevents trackpad inertia from silently consuming the next stage. */
      gestureGap: 190,
      gestureThreshold: 48
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
    let handoffFrame = 0;
    let wheelAccumulator = 0;
    let wheelDirection = 0;
    let wheelGestureConsumed = false;
    let lastWheelAt = 0;
    let wheelGestureTimer = 0;
    let touchCaptured = false;
    let touchMoved = false;
    let touchStartedOnGallery = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartAt = 0;
    let lastScrollY = window.scrollY;
    const timers = /* @__PURE__ */ new Set();
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
      return 0;
    };
    const getTravelOffset = () => Math.max(460, window.innerWidth * 0.62);
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
        entry: { x: 0, y: 28, scale: 0.9, opacity: 0.36 },
        focus: { x: 0, y: 0, scale: isMobileViewport() ? 1.012 : 1.018, opacity: 1 },
        right: { x: travelOffset, y: 12, scale: 0.958, opacity: 0 },
        left: { x: -travelOffset, y: 9, scale: 0.944, opacity: 0 }
      };
      const visual = states[mode] || states.right;
      card.dataset.depthState = mode;
      card.style.setProperty("--depth-x", `${visual.x.toFixed(2)}px`);
      card.style.setProperty("--depth-y", `${visual.y.toFixed(2)}px`);
      card.style.setProperty("--depth-scale", visual.scale.toFixed(4));
      card.style.setProperty("--depth-opacity", visual.opacity.toFixed(4));
      card.style.setProperty("z-index", mode === "focus" ? "960" : mode === "rest" ? "940" : "900");
    };
    const setCardFrame = (card, { x, y, scale, opacity, blur, saturate }, zIndex) => {
      if (!card) return;
      card.style.setProperty("--depth-x", `${x.toFixed(2)}px`);
      card.style.setProperty("--depth-y", `${y.toFixed(2)}px`);
      card.style.setProperty("--depth-scale", scale.toFixed(4));
      card.style.setProperty("--depth-opacity", opacity.toFixed(4));
      card.style.setProperty("--depth-blur", `${blur.toFixed(2)}px`);
      card.style.setProperty("--depth-saturate", saturate.toFixed(4));
      card.style.setProperty("z-index", String(zIndex));
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
        const interactive = index === activeIndex && !autoAnimating && (cardHasPhoto(card) || root.classList.contains("editing"));
        card.style.setProperty("pointer-events", interactive ? "auto" : "none", "important");
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
      if (controlsStatus) controlsStatus.textContent = `${pad(activeIndex + 1)} / ${pad(cards.length)}`;
      if (titleLabel) titleLabel.textContent = title;
      if (noteLabel) noteLabel.textContent = note;
      syncIndicator();
      const progress = cards.length > 1 ? activeIndex / (cards.length - 1) : 0;
      sticky.style.setProperty("--works-progress", progress.toFixed(4));
      scene.style.setProperty("--depth-phase", String(activeIndex));
      controls?.style.setProperty("--works-progress", progress.toFixed(4));
      hud?.setAttribute(
        "data-scroll-state",
        `${isMobileViewport() ? "DIRECT FOCUS" : "BOUNDED DEPTH"} \xB7 ${pad(activeIndex + 1)}`
      );
      if (previousButton) {
        previousButton.disabled = activeIndex === 0;
        previousButton.setAttribute("aria-disabled", String(previousButton.disabled));
      }
      if (nextButton) {
        nextButton.disabled = activeIndex === cards.length - 1;
        nextButton.setAttribute("aria-disabled", String(nextButton.disabled));
      }
      updateInteractivity();
    };
    const setNavigationHint = () => {
      setHint(isMobileViewport() ? "\u8F7B\u6ED1\u4E00\u6B21 \xB7 \u805A\u7126\u5F53\u524D\u4F5C\u54C1" : "\u8F7B\u6EDA\u4E00\u6B21 \xB7 \u805A\u7126\u5F53\u524D\u4F5C\u54C1");
    };
    const renderRest = ({ initialize = false, keepQueue = false, animateEntry = false } = {}) => {
      const token = ++sequenceToken;
      const mobile = isMobileViewport();
      const shouldAnimateEntry = false;
      autoAnimating = false;
      if (!keepQueue) queuedDirection = 0;
      setBusy(false);
      if (initialize) sticky.classList.add("is-initializing");
      sticky.classList.remove("is-stage-focused", "is-mobile-direct-focus", "is-copy-hidden", "is-switching", "is-releasing", "is-dual-handoff");
      cards.forEach((card, index) => {
        card.removeAttribute("data-depth-outgoing");
        card.removeAttribute("data-depth-incoming");
        const currentMode = shouldAnimateEntry ? "entry" : "rest";
        setCardVisual(card, index < activeIndex ? "left" : index === activeIndex ? currentMode : "right");
      });
      allCards.filter((card) => !cards.includes(card)).forEach((card) => {
        card.removeAttribute("data-exhibit-active");
        card.removeAttribute("data-depth-current");
        card.removeAttribute("data-depth-outgoing");
        card.removeAttribute("data-depth-incoming");
        setCardVisual(card, "right");
        card.style.setProperty("pointer-events", "none", "important");
        card.setAttribute("aria-hidden", "true");
      });
      updateHud(activeIndex);
      setNavigationHint();
      stage = shouldAnimateEntry ? "entering" : "rest";
      stageDirection = 1;
      if (shouldAnimateEntry) {
        autoAnimating = true;
        setBusy(true);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(async () => {
            if (destroyed || token !== sequenceToken) return;
            const motion = waitForMotion(cards[activeIndex], timings.entry);
            sticky.classList.remove("is-initializing");
            setCardVisual(cards[activeIndex], "focus");
            await motion;
            if (destroyed || token !== sequenceToken) return;
            finishAction(token, "focused");
          });
        });
      } else if (initialize) {
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
      sticky.classList.add("is-stage-focused");
      sticky.classList.add("is-copy-hidden");
      setHint(direction > 0 ? "\u518D\u6B21\u8F7B\u6EDA \xB7 \u524D\u5F80\u4E0B\u4E00\u7EC4" : "\u518D\u6B21\u8F7B\u6EDA \xB7 \u8FD4\u56DE\u4E0A\u4E00\u7EC4");
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
      setHint("\u6B63\u5728\u8FD4\u56DE\u5F53\u524D\u4F5C\u54C1");
      updateInteractivity();
      await waitForMotion(cards[activeIndex], timings.focus);
      if (destroyed || token !== sequenceToken) return;
      setHint("\u8F7B\u6EDA\u4E00\u6B21 \xB7 \u5148\u805A\u7126\u5F53\u524D\u4F5C\u54C1");
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
        window.scrollTo(0, from + distance * (reducedMotion ? 1 : passageEase(progress)));
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
      setHint(direction > 0 ? "\u4F5C\u54C1\u6D4F\u89C8\u5B8C\u6210 \xB7 \u7EE7\u7EED\u5411\u4E0B" : "\u8FD4\u56DE\u4F5C\u54C1\u5F00\u7BC7");
      updateInteractivity();
      await waitForMotion(currentCard, timings.release);
      if (destroyed || token !== sequenceToken) return;
      root.classList.remove("works-scroll-engaged");
      const areaTop = getAreaTop();
      const worksSection = scrollArea.closest("section");
      const adjacentSection = direction > 0 ? worksSection?.nextElementSibling : worksSection;
      const adjacentTop = adjacentSection ? window.scrollY + adjacentSection.getBoundingClientRect().top : null;
      const target = adjacentTop === null ? direction > 0 ? areaTop + scrollArea.offsetHeight + 2 : Math.max(0, areaTop - Math.min(window.innerHeight * 0.72, 680)) : Math.max(0, adjacentTop);
      await smoothWindowScroll(target);
      if (destroyed || token !== sequenceToken) return;
      currentCard?.removeAttribute("data-depth-outgoing");
      sticky.classList.remove("is-switching", "is-releasing", "is-stage-focused", "is-mobile-direct-focus", "is-copy-hidden", "is-dual-handoff");
      autoAnimating = false;
      stage = "rest";
      setBusy(false);
      isPinned = false;
      wasPinned = false;
      renderRest({ initialize: true });
    };
    const animateDualHandoff = (outgoing, incoming, direction, duration) => new Promise((resolve) => {
      window.cancelAnimationFrame(handoffFrame);
      sticky.classList.add("is-dual-handoff");
      const startedAt = performance.now();
      const travel = getTravelOffset();
      const focusScale = isMobileViewport() ? 1.012 : 1.018;
      const incomingStartX = direction * travel * (isMobileViewport() ? 0.58 : 0.72);
      const outgoingEndX = -direction * travel;
      const frame = (time) => {
        if (destroyed) return;
        const progress = reducedMotion ? 1 : clamp((time - startedAt) / Math.max(1, duration));
        const departure = handoffDepartureEase(clamp(progress / 0.9));
        const arrival = handoffArrivalEase(clamp((progress - 0.055) / 0.885));
        const departureFade = handoffDepartureEase(clamp((progress - 0.12) / 0.7));
        const arrivalFade = handoffArrivalEase(clamp((progress - 0.035) / 0.78));
        const departureArc = Math.sin(Math.PI * clamp(progress));
        const arrivalArc = Math.sin(Math.PI * clamp(arrival));
        setCardFrame(outgoing, {
          x: outgoingEndX * departure,
          y: -10 * departureArc + 7 * departure,
          scale: focusScale + 0.014 * Math.sin(Math.PI * clamp(progress / 0.52)) - (focusScale - 0.94) * departure,
          opacity: 1 - departureFade,
          blur: 7.5 * departureFade,
          saturate: 1 - 0.12 * departureFade
        }, 962);
        setCardFrame(incoming, {
          x: incomingStartX * (1 - arrival),
          y: 18 * (1 - arrival) - 6 * arrivalArc,
          scale: 0.93 + 0.07 * arrival + 9e-3 * arrivalArc,
          opacity: arrivalFade,
          blur: 8 * (1 - arrivalFade),
          saturate: 0.88 + 0.12 * arrivalFade
        }, 961);
        if (progress < 1) {
          handoffFrame = window.requestAnimationFrame(frame);
          return;
        }
        handoffFrame = 0;
        setCardVisual(outgoing, direction > 0 ? "left" : "right");
        setCardVisual(incoming, "rest");
        outgoing.style.setProperty("--depth-blur", "0px");
        outgoing.style.setProperty("--depth-saturate", "1");
        incoming.style.setProperty("--depth-blur", "0px");
        incoming.style.setProperty("--depth-saturate", "1");
        void incoming.offsetWidth;
        sticky.classList.remove("is-dual-handoff");
        resolve();
      };
      handoffFrame = window.requestAnimationFrame(frame);
    });
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
      sticky.classList.add("is-switching", "is-stage-focused");
      sticky.classList.remove("is-mobile-direct-focus");
      sticky.classList.add("is-copy-hidden");
      const outgoing = cards[activeIndex];
      const incoming = cards[nextIndex];
      outgoing.setAttribute("data-depth-outgoing", "");
      incoming.setAttribute("data-depth-incoming", "");
      updateInteractivity();
      const handoffMotion = animateDualHandoff(outgoing, incoming, direction, timings.switch);
      const storySwap = (async () => {
        await delay(timings.storySwap);
        if (destroyed || token !== sequenceToken) return;
        updateHud(nextIndex);
        setHint("\u4E0B\u4E00\u7EC4\u4F5C\u54C1\u6B63\u5728\u843D\u4F4D");
      })();
      await Promise.all([handoffMotion, storySwap]);
      if (destroyed || token !== sequenceToken) return;
      await delay(timings.settle);
      if (destroyed || token !== sequenceToken) return;
      outgoing.removeAttribute("data-depth-outgoing");
      incoming.removeAttribute("data-depth-incoming");
      sticky.classList.remove("is-switching");
      sticky.classList.remove("is-stage-focused", "is-mobile-direct-focus", "is-copy-hidden");
      stageDirection = direction;
      setNavigationHint();
      finishAction(token, "rest");
    };
    function triggerStage(direction) {
      if (!cards.length || destroyed || stage === "releasing") return;
      if (autoAnimating) {
        return;
      }
      if (stage === "rest") {
        focusCurrent(direction);
        return;
      }
      if (stage === "focused") {
        if (isMobileViewport()) switchWork(direction);
        else if (direction === stageDirection) switchWork(direction);
        else returnToRest();
      }
    }
    const queueStage = (direction) => {
      if (stage === "releasing") return;
      if (autoAnimating) {
        queuedDirection = 0;
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
      if (Math.abs(delta) < 0.5) return;
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
        const currentScrollY = window.scrollY;
        const entryDirection = currentScrollY >= lastScrollY ? 1 : -1;
        lastScrollY = currentScrollY;
        const metrics = getMetrics();
        isPinned = metrics.pinned;
        root.classList.toggle("works-scroll-engaged", isPinned);
        if (isPinned && !wasPinned && !autoAnimating && !root.classList.contains("editing")) {
          activeIndex = entryDirection > 0 ? 0 : cards.length - 1;
          renderRest({ initialize: true, animateEntry: isMobileViewport() });
        }
        wasPinned = isPinned;
      });
    };
    const refreshCards = ({ keepCurrent = true } = {}) => {
      const editing = root.classList.contains("editing");
      const currentCard = cards[activeIndex];
      allCards = Array.from(grid.querySelectorAll(".work-card"));
      cards = allCards.filter((card) => editing || cardHasPhoto(card));
      if (!cards.length) cards = allCards.slice(0, 1);
      const retainedIndex = keepCurrent && currentCard ? cards.indexOf(currentCard) : -1;
      activeIndex = retainedIndex >= 0 ? retainedIndex : clamp(activeIndex, 0, cards.length - 1);
      measureIndicator();
      const metrics = getMetrics();
      renderRest({ initialize: true, animateEntry: metrics.pinned && isMobileViewport() });
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
      touchMoved = false;
      touchStartedOnGallery = Boolean(event.target.closest?.("[data-image-slot][role='button']"));
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartAt = performance.now();
    }, { passive: true });
    sticky.addEventListener("touchmove", (event) => {
      if (!touchCaptured || !isPinned || root.classList.contains("editing")) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (Math.hypot(deltaX, deltaY) < 12) return;
      touchMoved = true;
      if (!touchStartedOnGallery || Math.abs(deltaY) > Math.abs(deltaX) * 1.08) {
        event.preventDefault();
      }
    }, { passive: false });
    sticky.addEventListener("touchend", (event) => {
      if (!touchCaptured || root.classList.contains("editing")) return;
      touchCaptured = false;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const delta = touchStartY - touch.clientY;
      const elapsed = performance.now() - touchStartAt;
      if (touchStartedOnGallery && !touchMoved) return;
      if (Math.abs(delta) < 34 || elapsed > 1300) return;
      queueStage(delta > 0 ? 1 : -1);
    }, { passive: true });
    sticky.addEventListener("touchcancel", () => {
      touchCaptured = false;
      touchMoved = false;
      touchStartedOnGallery = false;
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
    const handleWorksChanged = () => {
      if (destroyed) return;
      refreshCards({ keepCurrent: true });
    };
    window.addEventListener("len:works-changed", handleWorksChanged);
    window.addEventListener("pagehide", () => {
      destroyed = true;
      sequenceToken += 1;
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      window.clearTimeout(wheelGestureTimer);
      window.cancelAnimationFrame(scrollFrame);
      window.cancelAnimationFrame(resizeFrame);
      window.cancelAnimationFrame(scrollAnimationFrame);
      window.cancelAnimationFrame(handoffFrame);
      editingObserver.disconnect();
      window.removeEventListener("len:works-changed", handleWorksChanged);
      root.classList.remove("works-scroll-engaged");
    }, { once: true });
    refreshCards({ keepCurrent: false });
  })();

  // source-site/assets/refined-v3.js
  (() => {
    "use strict";
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    document.addEventListener("touchstart", () => {
      root.classList.add("len-touch");
    }, { passive: true, once: true });
    const liftBriefly = (element, className, duration = 640) => {
      if (!element || reducedMotion) return;
      element.classList.remove(className);
      void element.offsetWidth;
      element.classList.add(className);
      window.setTimeout(() => element.classList.remove(className), duration);
    };
    const statement = document.querySelector(".hero__statement");
    if (statement) {
      let titleFrame = 0;
      let titleX = 0;
      let titleY = 0;
      const paintTitle = () => {
        titleFrame = 0;
        statement.style.setProperty("--statement-x", `${titleX.toFixed(2)}px`);
        statement.style.setProperty("--statement-y", `${titleY.toFixed(2)}px`);
      };
      if (finePointer && !reducedMotion) {
        statement.addEventListener("pointerenter", () => statement.classList.add("is-energized"), { passive: true });
        statement.addEventListener("pointermove", (event) => {
          const bounds = statement.getBoundingClientRect();
          titleX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 7;
          titleY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 5;
          if (!titleFrame) titleFrame = window.requestAnimationFrame(paintTitle);
        }, { passive: true });
        statement.addEventListener("pointerleave", () => {
          statement.classList.remove("is-energized");
          titleX = 0;
          titleY = 0;
          if (!titleFrame) titleFrame = window.requestAnimationFrame(paintTitle);
        }, { passive: true });
      }
      statement.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse") return;
        liftBriefly(statement, "is-touch-lift", 700);
      }, { passive: true });
    }
    const exhibitHud = document.querySelector(".works-exhibit__hud");
    if (exhibitHud) {
      if (finePointer && !reducedMotion) {
        exhibitHud.addEventListener("pointerenter", () => exhibitHud.classList.add("is-copy-lifted"), { passive: true });
        exhibitHud.addEventListener("pointerleave", () => exhibitHud.classList.remove("is-copy-lifted"), { passive: true });
      }
      exhibitHud.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse") return;
        liftBriefly(exhibitHud, "is-touch-lift", 620);
      }, { passive: true });
    }
    const exhibit = document.getElementById("works-exhibit-scroll");
    if (exhibit) {
      exhibit.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse") return;
        const activeCard = exhibit.querySelector(".work-card[data-exhibit-active]");
        if (activeCard) liftBriefly(activeCard, "is-touch-lift", 520);
      }, { passive: true });
    }
    window.addEventListener("pagehide", () => {
      if (statement) {
        statement.style.removeProperty("--statement-x");
        statement.style.removeProperty("--statement-y");
      }
    }, { passive: true });
  })();

  // source-site/assets/hero-interaction.js
  (() => {
    "use strict";
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const init = () => {
      const root = document.documentElement;
      const hero = document.getElementById("top");
      const title = hero?.querySelector(".hero__statement");
      const media = hero?.querySelector(".hero__media");
      const copy = hero?.querySelector(".hero__copy");
      if (!hero || !title || !media || !copy) return;
      const experience = window.LENExperience || {
        quality: "medium",
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        pointer: { x: 0, y: 0 }
      };
      const wrapLine = (line) => {
        if (line.querySelector(".wave-letter")) return;
        const text = line.textContent || "";
        line.textContent = "";
        Array.from(text).forEach((character, index) => {
          const letter = document.createElement("span");
          letter.className = "wave-letter";
          letter.dataset.waveIndex = String(index);
          letter.textContent = character === " " ? "\xA0" : character;
          letter.setAttribute("aria-hidden", "true");
          line.appendChild(letter);
        });
        line.setAttribute("aria-label", text);
      };
      Array.from(title.children).forEach((line) => wrapLine(line));
      const letters = Array.from(title.querySelectorAll(".wave-letter"));
      const states = letters.map(() => ({ y: 0, velocity: 0, target: 0 }));
      let centers = [];
      let pointerInside = false;
      let pointerX = 0;
      let pointerY = 0;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let scrollDepth = 0;
      let frame = 0;
      let lastTime = performance.now();
      const config = () => {
        const quality = experience.quality || root.dataset.quality || "medium";
        const mobile = window.matchMedia("(hover: none), (pointer: coarse)").matches;
        if (experience.reducedMotion) return { x: 0, y: 0, wave: 0, radius: 1 };
        if (quality === "high") return mobile ? { x: 18, y: 11, wave: 8, radius: 120 } : { x: clamp(window.innerWidth * 0.027, 28, 46), y: clamp(window.innerHeight * 0.026, 16, 29), wave: 17, radius: 190 };
        if (quality === "medium") return mobile ? { x: 13, y: 8, wave: 6, radius: 105 } : { x: clamp(window.innerWidth * 0.021, 22, 35), y: clamp(window.innerHeight * 0.019, 13, 22), wave: 12, radius: 160 };
        return mobile ? { x: 7, y: 4, wave: 4, radius: 82 } : { x: 16, y: 10, wave: 7, radius: 120 };
      };
      const measureLetters = () => {
        centers = letters.map((letter) => {
          const bounds = letter.getBoundingClientRect();
          return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
        });
      };
      const setWaveTargets = (time) => {
        const settings = config();
        states.forEach((state, index) => {
          if (!pointerInside || !centers[index] || settings.wave === 0) {
            state.target = 0;
            return;
          }
          const dx = pointerX - centers[index].x;
          const dy = pointerY - centers[index].y;
          const distance = Math.hypot(dx, dy * 0.72);
          const influence = clamp(1 - distance / settings.radius, 0, 1);
          const liquidPhase = distance * 0.055 - time * 43e-4;
          state.target = Math.sin(liquidPhase) * settings.wave * influence * influence;
        });
      };
      const render = (time) => {
        frame = 0;
        const delta = clamp((time - lastTime) / 16.67, 0.45, 2.2);
        lastTime = time;
        const settings = config();
        setWaveTargets(time);
        currentX += (targetX - currentX) * (0.075 * delta);
        currentY += (targetY - currentY) * (0.075 * delta);
        const scrollY = -scrollDepth * Math.min(window.innerHeight * 0.12, 108);
        const scrollScale = 1.085 - scrollDepth * 0.075;
        hero.style.setProperty("--len-hero-image-x", `${currentX.toFixed(2)}px`);
        hero.style.setProperty("--len-hero-image-y", `${(currentY + scrollY).toFixed(2)}px`);
        hero.style.setProperty("--len-hero-image-scale", scrollScale.toFixed(4));
        hero.style.setProperty("--len-hero-bg-x", `${(currentX * 0.22).toFixed(2)}px`);
        hero.style.setProperty("--len-hero-bg-y", `${(currentY * 0.18 + scrollY * 0.16).toFixed(2)}px`);
        hero.style.setProperty("--len-hero-mid-x", `${(currentX * 0.54).toFixed(2)}px`);
        hero.style.setProperty("--len-hero-mid-y", `${(currentY * 0.48 + scrollY * 0.42).toFixed(2)}px`);
        hero.style.setProperty("--len-hero-copy-x", `${(currentX * -0.16).toFixed(2)}px`);
        hero.style.setProperty("--len-hero-copy-y", `${(currentY * -0.12 + scrollY * 0.62).toFixed(2)}px`);
        let moving = Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.06;
        states.forEach((state, index) => {
          const force = (state.target - state.y) * 0.14;
          state.velocity = (state.velocity + force * delta) * Math.pow(0.76, delta);
          state.y += state.velocity * delta;
          if (Math.abs(state.target - state.y) + Math.abs(state.velocity) > 0.035) moving = true;
          const letter = letters[index];
          letter.style.setProperty("--wave-y", `${state.y.toFixed(2)}px`);
          letter.style.setProperty("--wave-r", `${(state.y * -0.055).toFixed(2)}deg`);
          letter.style.setProperty("--wave-sy", `${(1 + Math.abs(state.y) * 45e-4).toFixed(4)}`);
        });
        experience.pointer.x = currentX / Math.max(settings.x, 1);
        experience.pointer.y = currentY / Math.max(settings.y, 1);
        if (moving || pointerInside) frame = window.requestAnimationFrame(render);
      };
      const schedule = () => {
        if (!frame) {
          lastTime = performance.now();
          frame = window.requestAnimationFrame(render);
        }
      };
      const updatePointer = (event) => {
        const bounds = hero.getBoundingClientRect();
        const settings = config();
        const normalizedX = clamp((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5, -0.5, 0.5) * 2;
        const normalizedY = clamp((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5, -0.5, 0.5) * 2;
        pointerX = event.clientX;
        pointerY = event.clientY;
        targetX = normalizedX * settings.x;
        targetY = normalizedY * settings.y;
        pointerInside = true;
        root.classList.toggle("len-wave-active", title.matches(":hover") || event.pointerType !== "mouse");
        schedule();
      };
      const resetPointer = () => {
        pointerInside = false;
        targetX = 0;
        targetY = 0;
        root.classList.remove("len-wave-active");
        schedule();
      };
      const syncScroll = () => {
        const bounds = hero.getBoundingClientRect();
        scrollDepth = clamp(-bounds.top / Math.max(bounds.height, 1), 0, 1);
        schedule();
      };
      hero.addEventListener("pointermove", updatePointer, { passive: true });
      hero.addEventListener("pointerleave", resetPointer, { passive: true });
      hero.addEventListener("pointercancel", resetPointer, { passive: true });
      hero.addEventListener("pointerup", (event) => {
        if (event.pointerType !== "mouse") window.setTimeout(resetPointer, 420);
      }, { passive: true });
      title.addEventListener("pointerenter", () => {
        measureLetters();
        root.classList.add("len-wave-active");
        pointerInside = true;
        schedule();
      }, { passive: true });
      title.addEventListener("pointerleave", resetPointer, { passive: true });
      window.addEventListener("scroll", syncScroll, { passive: true });
      window.addEventListener("resize", () => {
        measureLetters();
        syncScroll();
      }, { passive: true });
      window.addEventListener("len:qualitychange", schedule);
      measureLetters();
      syncScroll();
      root.classList.add("len-hero-interaction-ready");
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  })();

  // source-site/assets/v40-about-envelope.js
  (() => {
    "use strict";
    const init = () => {
      const root = document.documentElement;
      const about = document.getElementById("about");
      const overlay = document.getElementById("about-envelope-experience");
      const openButton = document.getElementById("about-envelope-open");
      const letterTrigger = document.getElementById("about-letter-trigger");
      if (!about || !overlay || !openButton) return;
      const mobileBrandMode = window.matchMedia("(max-width: 900px)").matches;
      const experience = window.LENExperience || {
        quality: root.dataset.quality || "medium",
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        aboutPlayed: false
      };
      window.LENExperience = experience;
      const sessionKey = "len-about-letter-origin-v40";
      let playedThisVisit = experience.aboutPlayed;
      try {
        playedThisVisit = playedThisVisit || sessionStorage.getItem(sessionKey) === "complete";
      } catch {
        playedThisVisit = Boolean(experience.aboutPlayed);
      }
      let storyActive = false;
      let awaitingIntro = false;
      let pendingForce = false;
      let quickRevealReady = playedThisVisit;
      let lastFocused = null;
      const timers = /* @__PURE__ */ new Set();
      const preview = about.cloneNode(true);
      preview.removeAttribute("id");
      preview.className = "about about-letter-preview";
      preview.setAttribute("aria-hidden", "true");
      preview.querySelector(".about-letter-folds")?.remove();
      preview.querySelectorAll("[id]").forEach((item) => item.removeAttribute("id"));
      preview.querySelectorAll("[data-edit], [data-reveal], [data-portrait-card]").forEach((item) => {
        item.removeAttribute("data-edit");
        item.removeAttribute("data-reveal");
        item.removeAttribute("data-portrait-card");
        item.removeAttribute("contenteditable");
        item.classList.remove("reveal-pending", "is-revealed", "is-portrait-active", "is-len-portrait-interacting");
      });
      preview.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((item) => {
        item.setAttribute("tabindex", "-1");
      });
      preview.querySelectorAll("img").forEach((image) => {
        image.loading = "eager";
        image.alt = "";
      });
      overlay.append(preview);
      const later = (callback, delay) => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          callback();
        }, delay);
        timers.add(timer);
        return timer;
      };
      const clearTimers = () => {
        timers.forEach((timer) => window.clearTimeout(timer));
        timers.clear();
      };
      const introIsFinished = () => !root.classList.contains("intro-lock");
      const runQuickReveal = () => {
        if (storyActive || !quickRevealReady) return;
        about.classList.add("is-about-letter-open", "about-story-complete");
        about.classList.remove("is-about-up-reveal", "is-about-depth-reveal");
        void about.offsetWidth;
        about.classList.add("is-about-depth-reveal");
        later(() => about.classList.remove("is-about-depth-reveal"), experience.reducedMotion ? 260 : 1320);
      };
      const rememberStory = () => {
        playedThisVisit = true;
        quickRevealReady = true;
        experience.aboutPlayed = true;
        try {
          sessionStorage.setItem(sessionKey, "complete");
        } catch {
        }
      };
      const hideEnvelopeLayer = () => {
        overlay.className = "about-envelope-experience";
        overlay.setAttribute("aria-hidden", "true");
        overlay.hidden = true;
      };
      const finishLetterHandoff = () => {
        storyActive = false;
        about.classList.remove("is-about-letter-unfolding", "is-about-origin-rising", "is-about-preview-target");
        about.classList.add("is-about-letter-open", "about-story-complete");
        root.classList.remove("about-story-lock", "about-story-active");
        if (lastFocused && typeof lastFocused.focus === "function") {
          lastFocused.focus({ preventScroll: true });
        }
      };
      const beginLetterHandoff = () => {
        rememberStory();
        overlay.classList.add("is-completing", "is-origin-bridging", "is-previewing");
        const low = experience.quality === "low";
        const settleDelay = experience.reducedMotion ? 24 : low ? 1020 : 1320;
        const releaseDuration = experience.reducedMotion ? 40 : low ? 500 : 680;
        later(() => {
          about.classList.remove(
            "is-about-story-awaiting",
            "is-about-up-reveal",
            "is-about-depth-reveal",
            "about-story-armed",
            "is-about-letter-unfolding",
            "is-about-origin-rising"
          );
          about.classList.add("is-about-letter-open", "about-story-complete", "is-about-preview-target");
          const target = Math.max(0, window.scrollY + about.getBoundingClientRect().top);
          window.scrollTo({ left: 0, top: target, behavior: "auto" });
          void about.offsetWidth;
          window.requestAnimationFrame(() => overlay.classList.add("is-preview-releasing"));
        }, settleDelay);
        later(() => {
          hideEnvelopeLayer();
          finishLetterHandoff();
        }, settleDelay + releaseDuration + 80);
      };
      const openEnvelope = () => {
        if (!storyActive || overlay.classList.contains("is-opening")) return;
        openButton.disabled = true;
        overlay.classList.remove("is-awaiting-open");
        overlay.classList.add("is-opening");
        const low = experience.quality === "low";
        const reduced = experience.reducedMotion;
        const closingDelay = reduced ? 70 : low ? 1260 : 1620;
        const handoffDelay = reduced ? 120 : low ? 1540 : 1880;
        later(() => {
          overlay.classList.add("is-closing-to-about");
        }, closingDelay);
        later(beginLetterHandoff, handoffDelay);
      };
      const beginStory = ({ force = false } = {}) => {
        if (storyActive) return;
        if (playedThisVisit && !force) {
          runQuickReveal();
          return;
        }
        if (!introIsFinished()) {
          awaitingIntro = true;
          pendingForce = pendingForce || force;
          return;
        }
        storyActive = true;
        awaitingIntro = false;
        pendingForce = false;
        lastFocused = document.activeElement;
        clearTimers();
        about.classList.remove(
          "is-about-letter-open",
          "is-about-letter-unfolding",
          "is-about-origin-rising",
          "is-about-depth-reveal",
          "is-about-up-reveal",
          "is-about-preview-target"
        );
        about.classList.add("is-about-story-awaiting");
        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
        openButton.disabled = true;
        root.classList.add("about-story-lock", "about-story-active");
        window.requestAnimationFrame(() => {
          overlay.classList.add("is-active");
          window.requestAnimationFrame(() => overlay.classList.add("is-approaching"));
        });
        const approachDelay = experience.reducedMotion ? 90 : experience.quality === "low" ? 480 : 620;
        later(() => {
          overlay.classList.add("is-awaiting-open");
          openButton.disabled = false;
          openButton.focus({ preventScroll: true });
        }, approachDelay);
      };
      const openFromTrigger = () => beginStory({ force: true });
      openButton.addEventListener("click", openEnvelope);
      letterTrigger?.addEventListener("click", openFromTrigger);
      const aboutLinks = Array.from(document.querySelectorAll('a[href="#about"]'));
      const openFromNavigation = (event) => {
        if (root.classList.contains("editing")) return;
        if (mobileBrandMode) return;
        event.preventDefault();
        try {
          window.history.replaceState(null, "", "#about");
        } catch {
        }
        beginStory({ force: true });
      };
      aboutLinks.forEach((link) => link.addEventListener("click", openFromNavigation));
      if (mobileBrandMode) {
        about.classList.add("about-story-complete", "is-about-letter-open");
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
      } else if (playedThisVisit) {
        experience.aboutPlayed = true;
        about.classList.add("about-story-complete", "is-about-letter-open");
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
      } else {
        about.classList.add("about-story-armed");
      }
      if (!mobileBrandMode && !("IntersectionObserver" in window)) {
        if (!playedThisVisit) beginStory();
      } else if (!mobileBrandMode) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || entry.intersectionRatio < 0.12) return;
            if (playedThisVisit) runQuickReveal();
            else beginStory();
          });
        }, { threshold: [0.12, 0.24, 0.5], rootMargin: "-4% 0px -8% 0px" });
        observer.observe(about);
      }
      const introObserver = new MutationObserver(() => {
        if (awaitingIntro && introIsFinished()) beginStory({ force: pendingForce });
      });
      introObserver.observe(root, { attributes: true, attributeFilter: ["class"] });
      if (!mobileBrandMode && window.location.hash === "#about") {
        window.requestAnimationFrame(() => beginStory({ force: true }));
      }
      window.addEventListener("pagehide", () => {
        clearTimers();
        introObserver.disconnect();
        letterTrigger?.removeEventListener("click", openFromTrigger);
        aboutLinks.forEach((link) => link.removeEventListener("click", openFromNavigation));
      }, { once: true });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  })();

  // source-site/assets/v16-jitter.js
  (() => {
    "use strict";
    const initEnvelopeJitter = () => {
      const overlay = document.getElementById("about-envelope-experience");
      const envelope = overlay?.querySelector(".len-envelope");
      if (!overlay || !envelope) return;
      let introPlayed = false;
      let clickTimer = 0;
      let introTimer = 0;
      const restartClass = (name, duration) => {
        overlay.classList.remove(name);
        void envelope.offsetWidth;
        overlay.classList.add(name);
        return window.setTimeout(() => overlay.classList.remove(name), duration);
      };
      const maybePlayEntrance = () => {
        if (introPlayed || !overlay.classList.contains("is-awaiting-open") || overlay.classList.contains("is-opening")) return;
        introPlayed = true;
        window.clearTimeout(introTimer);
        introTimer = restartClass("is-v16-entrance-jitter", 1750);
      };
      const observer = new MutationObserver(maybePlayEntrance);
      observer.observe(overlay, { attributes: true, attributeFilter: ["class", "hidden"] });
      maybePlayEntrance();
      envelope.addEventListener("pointerdown", () => {
        if (!overlay.classList.contains("is-awaiting-open") || overlay.classList.contains("is-opening")) return;
        window.clearTimeout(clickTimer);
        overlay.classList.remove("is-v16-entrance-jitter", "is-v16-click-jitter");
        void envelope.offsetWidth;
        overlay.classList.add("is-v16-click-jitter");
        clickTimer = window.setTimeout(() => overlay.classList.remove("is-v16-click-jitter"), 470);
      }, { passive: true });
      window.addEventListener("pagehide", () => {
        observer.disconnect();
        window.clearTimeout(clickTimer);
        window.clearTimeout(introTimer);
      }, { once: true });
    };
    const initWorksCopyJitter = () => {
      const intro = document.querySelector(".works-exhibit__intro");
      const hud = document.querySelector(".works-exhibit__hud");
      const title = document.getElementById("works-exhibit-title");
      if (!intro && !hud) return;
      let hudTimer = 0;
      let touchTimer = 0;
      const pulseHud = () => {
        if (!hud || document.documentElement.classList.contains("editing")) return;
        hud.classList.remove("is-v16-copy-jitter");
        void hud.offsetWidth;
        hud.classList.add("is-v16-copy-jitter");
        window.clearTimeout(hudTimer);
        hudTimer = window.setTimeout(() => hud.classList.remove("is-v16-copy-jitter"), 560);
      };
      if (title) {
        const titleObserver = new MutationObserver(pulseHud);
        titleObserver.observe(title, { childList: true, characterData: true, subtree: true });
        window.addEventListener("pagehide", () => titleObserver.disconnect(), { once: true });
      }
      const touchTargets = [
        ...intro ? intro.querySelectorAll(".eyebrow, h2, span") : [],
        ...hud ? hud.querySelectorAll("strong, p") : []
      ];
      touchTargets.forEach((node) => {
        node.addEventListener("pointerdown", (event) => {
          if (event.pointerType !== "touch" || document.documentElement.classList.contains("editing")) return;
          node.classList.remove("is-v16-copy-jitter");
          void node.offsetWidth;
          node.classList.add("is-v16-copy-jitter");
          window.clearTimeout(touchTimer);
          touchTimer = window.setTimeout(() => node.classList.remove("is-v16-copy-jitter"), 560);
        }, { passive: true });
      });
      window.addEventListener("pagehide", () => {
        window.clearTimeout(hudTimer);
        window.clearTimeout(touchTimer);
      }, { once: true });
    };
    const init = () => {
      initEnvelopeJitter();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  })();

  // source-site/assets/v18-refinements.js
  (() => {
    "use strict";
    const initWorksPlanStyleFloat = () => {
      const section = document.getElementById("works");
      if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const selector = [
        ".works-exhibit__intro .eyebrow",
        ".works-exhibit__intro h2",
        ".works-exhibit__intro > p > span",
        ".works-exhibit__hud > span",
        ".works-exhibit__hud > b",
        ".works-exhibit__hud > strong",
        ".works-exhibit__hud > p",
        ".works-exhibit__hud > em"
      ].join(",");
      const targets = Array.from(section.querySelectorAll(selector));
      if (!targets.length) return;
      targets.forEach((node) => node.classList.add("works-v18-float"));
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      let active = null;
      let tapTimer = 0;
      const reset = (target) => {
        if (!target) return;
        target.classList.remove("plan-float-target", "is-plan-float-tap");
        target.style.removeProperty("--plan-float-x");
        target.style.removeProperty("--plan-float-y");
        target.style.removeProperty("--plan-float-r");
      };
      const activate = (target, clientX, clientY, tap = false) => {
        if (!target || !section.contains(target) || document.documentElement.classList.contains("editing")) return;
        if (active && active !== target) reset(active);
        active = target;
        const rect = target.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2));
        const ny = Math.max(-1, Math.min(1, ((clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2));
        target.style.setProperty("--plan-float-x", `${(nx * 3.2).toFixed(2)}px`);
        target.style.setProperty("--plan-float-y", `${(ny * 1.6).toFixed(2)}px`);
        target.style.setProperty("--plan-float-r", `${(nx * 0.22).toFixed(2)}deg`);
        target.classList.add("plan-float-target");
        target.classList.toggle("is-plan-float-tap", tap);
      };
      if (finePointer) {
        section.addEventListener("pointermove", (event) => {
          const target = event.target.closest?.(selector);
          if (!target) {
            reset(active);
            active = null;
            return;
          }
          activate(target, event.clientX, event.clientY, false);
        }, { passive: true });
        section.addEventListener("pointerleave", () => {
          reset(active);
          active = null;
        }, { passive: true });
      }
      section.addEventListener("pointerdown", (event) => {
        const target = event.target.closest?.(selector);
        if (!target) return;
        window.clearTimeout(tapTimer);
        activate(target, event.clientX, event.clientY, true);
        tapTimer = window.setTimeout(() => {
          reset(target);
          if (active === target) active = null;
        }, 620);
      }, { passive: true });
      document.addEventListener("len-owner-editing-change", () => {
        if (!document.documentElement.classList.contains("editing")) return;
        reset(active);
        active = null;
      });
      window.addEventListener("pagehide", () => {
        window.clearTimeout(tapTimer);
        reset(active);
      }, { once: true });
    };
    const init = () => {
      initWorksPlanStyleFloat();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  })();

  // source-site/assets/ambient-motion.js
  (() => {
    "use strict";
    const init = () => {
      const root = document.documentElement;
      const experience = window.LENExperience || { quality: root.dataset.quality || "medium" };
      const sections = Array.from(document.querySelectorAll("#top, #about, #works, #booking, #service-intro, #services, #contact, .manifesto"));
      sections.forEach((section, index) => {
        section.classList.add("len-ambient-section", `len-ambient-section--${index + 1}`);
        if (!section.querySelector(":scope > .len-ambient-layer")) {
          const layer = document.createElement("i");
          layer.className = "len-ambient-layer";
          layer.setAttribute("aria-hidden", "true");
          section.prepend(layer);
        }
      });
      const hero = document.getElementById("top");
      const addMotes = () => {
        if (!hero || hero.querySelector(".len-motes") || experience.quality === "low") return;
        const field = document.createElement("div");
        field.className = "len-motes";
        field.setAttribute("aria-hidden", "true");
        const amount = experience.quality === "high" ? 12 : 6;
        for (let index = 0; index < amount; index += 1) {
          const mote = document.createElement("i");
          mote.style.setProperty("--mote-x", `${8 + index * 19 % 86}%`);
          mote.style.setProperty("--mote-y", `${12 + index * 31 % 76}%`);
          mote.style.setProperty("--mote-delay", `${-index * 1.7}s`);
          mote.style.setProperty("--mote-duration", `${16 + index % 5 * 4}s`);
          field.appendChild(mote);
        }
        hero.appendChild(field);
      };
      addMotes();
      window.addEventListener("len:qualitychange", (event) => {
        if (event.detail?.quality === "low") hero?.querySelector(".len-motes")?.remove();
        else addMotes();
      });
      if (!("IntersectionObserver" in window)) {
        sections.forEach((section) => section.classList.add("len-ambient-active"));
      } else {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => entry.target.classList.toggle("len-ambient-active", entry.isIntersecting));
        }, { threshold: 0.025, rootMargin: "12% 0px 12% 0px" });
        sections.forEach((section) => observer.observe(section));
      }
      root.classList.add("len-ambient-ready");
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  })();
})();

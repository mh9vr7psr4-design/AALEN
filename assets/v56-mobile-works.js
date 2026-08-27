/* LEN v56 — reliable native swipe with an AE-eased settle fallback. */
(() => {
  "use strict";

  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 900px)");
  if (!mobile.matches) return;

  const begin = () => {
    const section = document.getElementById("works");
    const grid = section?.querySelector(".works-grid");
    const sticky = section?.querySelector(".works-exhibit__sticky");
    const toggle = section?.querySelector(".works-description-toggle");
    const toggleLabel = toggle?.querySelector("span");
    const note = document.getElementById("works-exhibit-note");
    const previous = document.getElementById("works-loop-prev");
    const next = document.getElementById("works-loop-next");
    const status = section?.querySelector("[data-works-control-status]");
    const controls = section?.querySelector(".works-loop-controls");
    if (!section || !grid || !toggle || !note) return;

    root.classList.add("v56-mobile-works");
    section.classList.add("v56-description-ready");
    controls?.setAttribute("aria-label", "作品左右滑动与翻页控制");

    let cards = [];
    let activeIndex = 0;
    let lastRenderedIndex = -1;
    let animationFrame = 0;
    let settleTimer = 0;
    let touching = false;
    let animating = false;
    let pendingSwipeTarget = null;
    let suppressClickUntil = 0;
    let touchStart = null;

    const pad = (value) => String(value).padStart(2, "0");
    const collectCards = () => {
      cards = Array.from(grid.querySelectorAll(".work-card")).filter((card) => {
        const image = card.querySelector("img[data-photo]");
        return Boolean(image && !image.hidden && image.getAttribute("src"));
      });
    };

    const nearestIndex = () => {
      if (!cards.length) return 0;
      const center = grid.scrollLeft + grid.clientWidth / 2;
      let nearest = 0;
      let distance = Number.POSITIVE_INFINITY;
      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const nextDistance = Math.abs(cardCenter - center);
        if (nextDistance < distance) {
          nearest = index;
          distance = nextDistance;
        }
      });
      return nearest;
    };

    const targetLeft = (index) => {
      const card = cards[Math.max(0, Math.min(cards.length - 1, index))];
      if (!card) return grid.scrollLeft;
      return Math.max(0, card.offsetLeft - (grid.clientWidth - card.offsetWidth) / 2);
    };

    /* CSS cubic-bezier(.16, 1, .3, 1), solved by x for the same fast-out/soft-settle timing. */
    const aeEase = (progress) => {
      const x1 = .16;
      const y1 = 1;
      const x2 = .3;
      const y2 = 1;
      const sample = (t, a1, a2) => {
        const inverse = 1 - t;
        return 3 * inverse * inverse * t * a1 + 3 * inverse * t * t * a2 + t * t * t;
      };
      const derivative = (t) => {
        const inverse = 1 - t;
        return 3 * inverse * inverse * x1 + 6 * inverse * t * (x2 - x1) + 3 * t * t * (1 - x2);
      };
      let t = progress;
      for (let iteration = 0; iteration < 5; iteration += 1) {
        const slope = derivative(t);
        if (Math.abs(slope) < .0001) break;
        t -= (sample(t, x1, x2) - progress) / slope;
        t = Math.max(0, Math.min(1, t));
      }
      return sample(t, y1, y2);
    };

    const setDescription = (expanded) => {
      if (root.classList.contains("editing")) expanded = true;
      note.style.setProperty("--v56-note-height", `${Math.ceil(note.scrollHeight + 4)}px`);
      section.classList.toggle("v56-description-open", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      note.setAttribute("aria-hidden", String(!expanded));
      if (toggleLabel) toggleLabel.textContent = expanded ? "收起作品介绍" : "展开作品介绍";
    };

    const renderControls = (index = nearestIndex()) => {
      if (!cards.length) return;
      const resolved = Math.max(0, Math.min(cards.length - 1, index));
      const indexChanged = lastRenderedIndex !== resolved;
      activeIndex = resolved;
      if (lastRenderedIndex !== -1 && lastRenderedIndex !== resolved && !root.classList.contains("editing")) {
        setDescription(false);
      }
      lastRenderedIndex = resolved;
      if (status) status.textContent = `${pad(resolved + 1)} / ${pad(cards.length)}`;
      if (previous) {
        previous.disabled = resolved === 0;
        previous.setAttribute("aria-disabled", String(previous.disabled));
      }
      if (next) {
        next.disabled = resolved === cards.length - 1;
        next.setAttribute("aria-disabled", String(next.disabled));
      }
      section.dataset.v56WorkIndex = String(resolved + 1);
      if (indexChanged) window.requestAnimationFrame(() => fitAllHeadings());
    };

    const cancelAnimation = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      animating = false;
    };

    const animateToIndex = (index, duration = 560) => {
      if (!cards.length) return;
      const resolved = Math.max(0, Math.min(cards.length - 1, index));
      const start = grid.scrollLeft;
      const destination = targetLeft(resolved);
      const distance = destination - start;
      pendingSwipeTarget = null;
      window.clearTimeout(settleTimer);
      cancelAnimation();
      if (Math.abs(distance) <= .75 || root.classList.contains("reduce-motion")) {
        grid.scrollLeft = destination;
        renderControls(resolved);
        return;
      }
      const started = performance.now();
      animating = true;
      const step = (now) => {
        const progress = Math.min(1, (now - started) / duration);
        grid.scrollLeft = start + distance * aeEase(progress);
        renderControls();
        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(step);
        } else {
          grid.scrollLeft = destination;
          animating = false;
          animationFrame = 0;
          renderControls(resolved);
        }
      };
      animationFrame = window.requestAnimationFrame(step);
    };

    const settle = () => {
      if (touching || animating || !cards.length) return;
      const resolved = pendingSwipeTarget == null ? nearestIndex() : pendingSwipeTarget;
      const distance = Math.abs(grid.scrollLeft - targetLeft(resolved));
      pendingSwipeTarget = null;
      if (distance > 1.25) animateToIndex(resolved, 440);
      else renderControls(resolved);
    };

    const scheduleSettle = (delay = 170) => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, delay);
    };

    const bindControl = (button, direction) => {
      button?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (button.disabled) return;
        animateToIndex(nearestIndex() + direction, 560);
      }, true);
    };

    bindControl(previous, -1);
    bindControl(next, 1);

    toggle.addEventListener("click", () => {
      setDescription(toggle.getAttribute("aria-expanded") !== "true");
    });

    grid.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      cancelAnimation();
      window.clearTimeout(settleTimer);
      touching = true;
      pendingSwipeTarget = null;
      const touch = event.touches[0];
      touchStart = {
        x: touch.clientX,
        y: touch.clientY,
        scrollLeft: grid.scrollLeft,
        index: nearestIndex()
      };
    }, { passive: true });

    grid.addEventListener("touchend", (event) => {
      touching = false;
      if (!touchStart || !event.changedTouches.length) {
        touchStart = null;
        scheduleSettle();
        return;
      }
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const horizontalSwipe = Math.abs(deltaX) >= 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.18;
      const nativeDistance = Math.abs(grid.scrollLeft - touchStart.scrollLeft);
      if (horizontalSwipe) {
        suppressClickUntil = performance.now() + 420;
        pendingSwipeTarget = Math.max(0, Math.min(cards.length - 1, touchStart.index + (deltaX < 0 ? 1 : -1)));
        if (nativeDistance < 8) animateToIndex(pendingSwipeTarget, 560);
        else scheduleSettle(150);
      } else {
        scheduleSettle(190);
      }
      touchStart = null;
    }, { passive: true });

    grid.addEventListener("touchcancel", () => {
      touching = false;
      touchStart = null;
      pendingSwipeTarget = null;
      scheduleSettle();
    }, { passive: true });

    grid.addEventListener("click", (event) => {
      if (performance.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    let scrollFrame = 0;
    grid.addEventListener("scroll", () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(() => renderControls());
      if (!touching && !animating) scheduleSettle();
    }, { passive: true });

    if ("onscrollend" in window) {
      grid.addEventListener("scrollend", settle, { passive: true });
    }

    const refresh = () => {
      collectCards();
      activeIndex = Math.min(activeIndex, Math.max(0, cards.length - 1));
      lastRenderedIndex = -1;
      setDescription(false);
      window.requestAnimationFrame(() => {
        grid.scrollLeft = targetLeft(activeIndex);
        renderControls(activeIndex);
      });
    };

    window.addEventListener("len:works-changed", refresh);
    window.addEventListener("orientationchange", () => window.setTimeout(refresh, 120), { passive: true });
    window.addEventListener("resize", () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        grid.scrollLeft = targetLeft(activeIndex);
        renderControls(activeIndex);
      }, 120);
    }, { passive: true });

    const noteObserver = new MutationObserver(() => {
      note.style.setProperty("--v56-note-height", `${Math.ceil(note.scrollHeight + 4)}px`);
    });
    noteObserver.observe(note, { childList: true, characterData: true, subtree: true });

    const editorObserver = new MutationObserver(() => {
      if (root.classList.contains("editing")) {
        note.setAttribute("aria-hidden", "false");
      } else {
        setDescription(false);
      }
    });
    editorObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

    /* Prevent a single Han character/word from becoming the final heading line. */
    const headingSelector = [
      "#booking .section-heading h2",
      "#booking .booking-step h3",
      "#service-intro .service-intro__header h2",
      "#service-intro .service-plan h3",
      "#service-intro .service-extra h3",
      "#service-intro .service-rules h3",
      "#service-intro .makeup-showcase h3",
      "#works .works-exhibit__intro h2",
      "#works #works-exhibit-title",
      "#about .about__copy h2"
    ].join(",");
    let headingFrame = 0;

    const readHeadingLines = (heading) => {
      const lines = [];
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let textNode = walker.nextNode();
      while (textNode) {
        for (let offset = 0; offset < textNode.data.length; offset += 1) {
          const character = textNode.data.slice(offset, offset + 1);
          if (!character.trim()) continue;
          range.setStart(textNode, offset);
          range.setEnd(textNode, offset + 1);
          const rect = range.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          let line = lines.find((item) => Math.abs(item.top - rect.top) <= 2);
          if (!line) {
            line = { top: rect.top, text: "" };
            lines.push(line);
          }
          line.text += character;
        }
        textNode = walker.nextNode();
      }
      return lines.sort((a, b) => a.top - b.top);
    };

    const meaningfulCount = (value) => (String(value).match(/[\p{L}\p{N}]/gu) || []).length;
    const hasOrphanLine = (heading) => {
      const lines = readHeadingLines(heading);
      return lines.length > 1 && meaningfulCount(lines[lines.length - 1]?.text) <= 1;
    };

    const fitHeading = (heading) => {
      if (!heading || heading.getClientRects().length === 0) return true;
      heading.classList.remove("v56-orphan-guard");
      heading.style.removeProperty("--v56-orphan-font-size");
      heading.style.removeProperty("--v56-orphan-letter-spacing");
      const computed = getComputedStyle(heading);
      const baseSize = Number.parseFloat(computed.fontSize);
      if (!Number.isFinite(baseSize) || baseSize <= 0 || !hasOrphanLine(heading)) return true;

      heading.classList.add("v56-orphan-guard");
      const minimum = Math.max(18, baseSize * .78);
      let size = baseSize;
      while (size > minimum && hasOrphanLine(heading)) {
        size = Math.max(minimum, size - .5);
        heading.style.setProperty("--v56-orphan-font-size", `${size.toFixed(2)}px`);
      }
      if (hasOrphanLine(heading)) {
        heading.style.setProperty("--v56-orphan-letter-spacing", "-.055em");
        while (size > Math.max(17, baseSize * .72) && hasOrphanLine(heading)) {
          size -= .5;
          heading.style.setProperty("--v56-orphan-font-size", `${size.toFixed(2)}px`);
        }
      }
      return !hasOrphanLine(heading);
    };

    const fitAllHeadings = () => {
      window.cancelAnimationFrame(headingFrame);
      headingFrame = window.requestAnimationFrame(() => {
        const headings = Array.from(document.querySelectorAll(headingSelector));
        const passed = headings.filter((heading) => heading.getClientRects().length).every(fitHeading);
        root.dataset.v56TitleCheck = passed ? "pass" : "guarded";
      });
    };

    document.addEventListener("input", (event) => {
      if (event.target.closest?.(headingSelector)) fitAllHeadings();
    }, true);
    document.addEventListener("click", (event) => {
      if (event.target.closest?.("[data-plan-choice], .plan-choice")) {
        window.setTimeout(fitAllHeadings, 40);
      }
    }, true);
    window.addEventListener("resize", fitAllHeadings, { passive: true });
    window.addEventListener("orientationchange", fitAllHeadings, { passive: true });
    if (document.fonts?.ready) document.fonts.ready.then(fitAllHeadings).catch(() => {});

    const runSelfCheck = () => {
      const card = cards[nearestIndex()];
      if (!card || !controls) return;
      const gridRect = grid.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      const centerError = Math.abs((cardRect.left + cardRect.width / 2) - (gridRect.left + gridRect.width / 2));
      const verticalGap = Math.max(0, controlsRect.top - cardRect.bottom);
      const stickyTouch = getComputedStyle(sticky || grid).touchAction;
      const gridTouch = getComputedStyle(grid).touchAction;
      const swipeAllowed = !/pan-y\s*$/i.test(stickyTouch) && /pan-x|auto/i.test(gridTouch);
      const compact = controlsRect.height <= 54 && verticalGap <= 22;
      root.dataset.v56WorksCheck = centerError <= 1.25 && swipeAllowed && compact ? "pass" : "guarded";
      root.style.setProperty("--v56-works-center-error", `${centerError.toFixed(2)}px`);
      root.style.setProperty("--v56-works-control-gap", `${verticalGap.toFixed(2)}px`);
    };

    collectCards();
    setDescription(false);
    fitAllHeadings();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        grid.scrollLeft = targetLeft(0);
        renderControls(0);
        runSelfCheck();
      });
    });
    window.addEventListener("load", runSelfCheck, { once: true, passive: true });
    window.addEventListener("pagehide", () => {
      window.clearTimeout(settleTimer);
      cancelAnimation();
      window.cancelAnimationFrame(headingFrame);
      noteObserver.disconnect();
      editorObserver.disconnect();
    }, { once: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", begin, { once: true });
  } else {
    begin();
  }
})();

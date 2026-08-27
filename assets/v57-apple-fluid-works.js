/* LEN v57 — Apple-inspired mobile Works rail.
   Principle: preserve native iOS momentum; only settle after momentum becomes quiet. */
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
    const title = document.getElementById("works-exhibit-title");
    const indexLabel = document.getElementById("works-exhibit-index");
    const note = document.getElementById("works-exhibit-note");
    const previous = document.getElementById("works-loop-prev");
    const next = document.getElementById("works-loop-next");
    const controls = section?.querySelector(".works-loop-controls");
    const status = controls?.querySelector("[data-works-control-status]");
    if (!section || !grid || !toggle || !note) return;

    root.classList.add("v56-mobile-works", "v57-apple-fluid-works");
    section.classList.add("v56-description-ready", "v57-description-ready");
    controls?.setAttribute("aria-label", "作品滑动与翻页控制");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const pad = (value) => String(value).padStart(2, "0");

    let cards = [];
    let activeIndex = 0;
    let renderedIndex = -1;
    let touching = false;
    let nativeScrolling = false;
    let touchStart = null;
    let touchLast = null;
    let suppressClickUntil = 0;
    let settleTimer = 0;
    let scrollingTimer = 0;
    let animationFrame = 0;
    let scrollFrame = 0;
    let headingFrame = 0;
    let animationToken = 0;

    const collectCards = () => {
      cards = Array.from(grid.querySelectorAll(".work-card")).filter((card) => {
        const image = card.querySelector("img[data-photo]");
        return Boolean(image && !image.hidden && image.getAttribute("src"));
      });
    };

    const targetLeft = (index) => {
      const card = cards[clamp(index, 0, Math.max(0, cards.length - 1))];
      if (!card) return grid.scrollLeft;
      return Math.max(0, card.offsetLeft - (grid.clientWidth - card.offsetWidth) / 2);
    };

    const nearestIndex = () => {
      if (!cards.length) return 0;
      const center = grid.scrollLeft + grid.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(cardCenter - center);
        if (distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      });
      return best;
    };

    const smoothstep = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 4);

    const setDescription = (expanded) => {
      if (root.classList.contains("editing")) expanded = true;
      note.style.setProperty("--v56-note-height", `${Math.ceil(note.scrollHeight + 4)}px`);
      section.classList.toggle("v56-description-open", expanded);
      section.classList.toggle("v57-description-open", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      note.setAttribute("aria-hidden", String(!expanded));
      if (toggleLabel) toggleLabel.textContent = expanded ? "收起作品介绍" : "展开作品介绍";
    };

    const syncHud = (resolved, closeDescription = false) => {
      const card = cards[resolved];
      if (!card) return;
      if (closeDescription && renderedIndex !== -1 && renderedIndex !== resolved && !root.classList.contains("editing")) {
        setDescription(false);
      }
      cards.forEach((item, index) => {
        if (index === resolved) item.setAttribute("data-exhibit-active", "");
        else item.removeAttribute("data-exhibit-active");
      });
      if (title) title.textContent = card.dataset.exhibitTitle || card.querySelector("h3")?.textContent || "作品";
      if (note) note.textContent = card.dataset.exhibitNote || card.querySelector(".work-card__editor-note")?.textContent || "";
      const total = cards.length;
      const count = `${pad(resolved + 1)} / ${pad(total)}`;
      if (indexLabel) indexLabel.textContent = count;
      if (status) {
        status.textContent = count;
        status.style.setProperty("--v57-progress", total > 0 ? String((resolved + 1) / total) : "0");
      }
      if (previous) {
        previous.disabled = resolved <= 0;
        previous.setAttribute("aria-disabled", String(previous.disabled));
      }
      if (next) {
        next.disabled = resolved >= total - 1;
        next.setAttribute("aria-disabled", String(next.disabled));
      }
      section.dataset.v57WorkIndex = String(resolved + 1);
      activeIndex = resolved;
      renderedIndex = resolved;
    };

    const updateVisuals = () => {
      if (!cards.length) return;
      const viewportCenter = grid.getBoundingClientRect().left + grid.clientWidth / 2;
      const cardWidth = Math.max(1, cards[0]?.getBoundingClientRect().width || grid.clientWidth * .86);
      let nearest = 0;
      let nearestDistance = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const raw = Math.abs(center - viewportCenter) / Math.max(cardWidth * .92, 1);
        const distance = clamp(raw, 0, 1.35);
        const eased = smoothstep(clamp(distance / 1.1, 0, 1));
        const scale = 1 - eased * .035;
        const y = eased * 7;
        const opacity = 1 - eased * .16;
        const captionOpacity = 1 - eased * .20;
        const imageScale = 1.012 + (1 - clamp(distance, 0, 1)) * .010;
        card.style.setProperty("--v57-scale", scale.toFixed(4));
        card.style.setProperty("--v57-y", `${y.toFixed(2)}px`);
        card.style.setProperty("--v57-opacity", opacity.toFixed(4));
        card.style.setProperty("--v57-caption-opacity", captionOpacity.toFixed(4));
        card.querySelector(".media img")?.style.setProperty("--v57-image-scale", imageScale.toFixed(4));
        if (raw < nearestDistance) {
          nearestDistance = raw;
          nearest = index;
        }
      });
      if (nearest !== renderedIndex) syncHud(nearest, true);
    };

    const cancelProgrammatic = () => {
      animationToken += 1;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const animateToIndex = (index, options = {}) => {
      if (!cards.length) return;
      const resolved = clamp(index, 0, cards.length - 1);
      const destination = targetLeft(resolved);
      const start = grid.scrollLeft;
      const distance = destination - start;
      const abs = Math.abs(distance);
      cancelProgrammatic();
      window.clearTimeout(settleTimer);
      if (abs < .75 || reducedMotion) {
        grid.scrollLeft = destination;
        syncHud(resolved, true);
        updateVisuals();
        return;
      }

      const token = animationToken;
      const duration = options.duration || clamp(430 + abs * .30, 480, 760);
      const started = performance.now();
      grid.classList.add("is-v57-scrolling");
      nativeScrolling = true;
      const step = (now) => {
        if (token !== animationToken) return;
        const t = clamp((now - started) / duration, 0, 1);
        const eased = smoothstep(t);
        grid.scrollLeft = start + distance * eased;
        updateVisuals();
        if (t < 1) {
          animationFrame = requestAnimationFrame(step);
        } else {
          grid.scrollLeft = destination;
          nativeScrolling = false;
          grid.classList.remove("is-v57-scrolling");
          syncHud(resolved, true);
          updateVisuals();
        }
      };
      animationFrame = requestAnimationFrame(step);
    };

    const settle = () => {
      window.clearTimeout(settleTimer);
      if (touching || nativeScrolling || !cards.length) return;
      const resolved = nearestIndex();
      const distance = Math.abs(grid.scrollLeft - targetLeft(resolved));
      if (distance > 1.5) animateToIndex(resolved, { duration: clamp(380 + distance * .28, 420, 620) });
      else syncHud(resolved, true);
    };

    const scheduleSettle = (delay = 105) => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, delay);
    };

    const bindControl = (button, direction) => {
      button?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (button.disabled) return;
        animateToIndex(nearestIndex() + direction, { duration: 650 });
      }, true);
    };
    bindControl(previous, -1);
    bindControl(next, 1);

    toggle.addEventListener("click", () => {
      setDescription(toggle.getAttribute("aria-expanded") !== "true");
    });

    grid.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      cancelProgrammatic();
      window.clearTimeout(settleTimer);
      touching = true;
      nativeScrolling = false;
      grid.classList.add("is-v57-touching");
      const t = event.touches[0];
      const now = performance.now();
      touchStart = { x: t.clientX, y: t.clientY, at: now, scrollLeft: grid.scrollLeft, index: nearestIndex() };
      touchLast = { x: t.clientX, y: t.clientY, at: now };
    }, { passive: true });

    grid.addEventListener("touchmove", (event) => {
      if (!touching || event.touches.length !== 1) return;
      const t = event.touches[0];
      touchLast = { x: t.clientX, y: t.clientY, at: performance.now() };
    }, { passive: true });

    grid.addEventListener("touchend", (event) => {
      const end = event.changedTouches[0];
      const start = touchStart;
      const last = touchLast;
      touching = false;
      grid.classList.remove("is-v57-touching");
      touchStart = null;
      touchLast = null;
      if (!start || !end) {
        scheduleSettle(120);
        return;
      }

      const dx = end.clientX - start.x;
      const dy = end.clientY - start.y;
      const moved = Math.hypot(dx, dy);
      const horizontal = Math.abs(dx) > Math.abs(dy) * 1.12;
      if (horizontal && moved > 10) suppressClickUntil = performance.now() + 360;

      /* Do not fight iOS momentum. Only help when a deliberate flick produced almost no native movement. */
      const nativeDistance = Math.abs(grid.scrollLeft - start.scrollLeft);
      const dt = Math.max(16, (last?.at || performance.now()) - start.at);
      const vx = ((last?.x ?? end.clientX) - start.x) / dt;
      if (horizontal && Math.abs(dx) >= 48 && nativeDistance < 9 && Math.abs(vx) > .18) {
        const direction = dx < 0 ? 1 : -1;
        animateToIndex(start.index + direction, { duration: 610 });
      } else {
        scheduleSettle(120);
      }
    }, { passive: true });

    grid.addEventListener("touchcancel", () => {
      touching = false;
      grid.classList.remove("is-v57-touching");
      touchStart = null;
      touchLast = null;
      scheduleSettle(120);
    }, { passive: true });

    grid.addEventListener("click", (event) => {
      if (performance.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    grid.addEventListener("scroll", () => {
      if (!nativeScrolling) {
        grid.classList.add("is-v57-scrolling");
        window.clearTimeout(scrollingTimer);
        scrollingTimer = window.setTimeout(() => grid.classList.remove("is-v57-scrolling"), 130);
      }
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(updateVisuals);
      if (!touching && !nativeScrolling) scheduleSettle(115);
    }, { passive: true });

    if ("onscrollend" in window) {
      grid.addEventListener("scrollend", () => {
        if (!touching && !nativeScrolling) settle();
      }, { passive: true });
    }

    const refresh = () => {
      collectCards();
      activeIndex = clamp(activeIndex, 0, Math.max(0, cards.length - 1));
      renderedIndex = -1;
      setDescription(false);
      requestAnimationFrame(() => {
        grid.scrollLeft = targetLeft(activeIndex);
        syncHud(activeIndex, false);
        updateVisuals();
      });
    };

    window.addEventListener("len:works-changed", refresh);
    window.addEventListener("orientationchange", () => setTimeout(refresh, 150), { passive: true });
    window.addEventListener("resize", () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        grid.scrollLeft = targetLeft(activeIndex);
        updateVisuals();
      }, 140);
    }, { passive: true });

    const noteObserver = new MutationObserver(() => {
      note.style.setProperty("--v56-note-height", `${Math.ceil(note.scrollHeight + 4)}px`);
    });
    noteObserver.observe(note, { childList: true, characterData: true, subtree: true });

    const editorObserver = new MutationObserver(() => {
      if (root.classList.contains("editing")) note.setAttribute("aria-hidden", "false");
      else setDescription(false);
    });
    editorObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

    /* Preserve the v56 orphan-line guard. */
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
      const baseSize = parseFloat(getComputedStyle(heading).fontSize);
      if (!Number.isFinite(baseSize) || !hasOrphanLine(heading)) return true;
      heading.classList.add("v56-orphan-guard");
      let size = baseSize;
      const minimum = Math.max(18, baseSize * .78);
      while (size > minimum && hasOrphanLine(heading)) {
        size = Math.max(minimum, size - .5);
        heading.style.setProperty("--v56-orphan-font-size", `${size.toFixed(2)}px`);
      }
      if (hasOrphanLine(heading)) {
        heading.style.setProperty("--v56-orphan-letter-spacing", "-.055em");
      }
      return !hasOrphanLine(heading);
    };
    const fitAllHeadings = () => {
      cancelAnimationFrame(headingFrame);
      headingFrame = requestAnimationFrame(() => {
        document.querySelectorAll(headingSelector).forEach(fitHeading);
      });
    };
    document.addEventListener("input", (event) => {
      if (event.target.closest?.(headingSelector)) fitAllHeadings();
    }, true);
    window.addEventListener("resize", fitAllHeadings, { passive: true });
    if (document.fonts?.ready) document.fonts.ready.then(fitAllHeadings).catch(() => {});

    const runSelfCheck = () => {
      const card = cards[nearestIndex()];
      if (!card || !controls) return;
      const gridRect = grid.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const controlsRect = controls.getBoundingClientRect();
      const centerError = Math.abs((cardRect.left + cardRect.width / 2) - (gridRect.left + gridRect.width / 2));
      const snapMode = getComputedStyle(grid).scrollSnapType;
      const compactControls = controlsRect.height <= 48;
      root.dataset.v57WorksCheck = centerError <= 1.75 && /proximity|none/i.test(snapMode) && compactControls ? "pass" : "guarded";
    };

    collectCards();
    setDescription(false);
    fitAllHeadings();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      grid.scrollLeft = targetLeft(0);
      syncHud(0, false);
      updateVisuals();
      runSelfCheck();
    }));

    window.addEventListener("load", runSelfCheck, { once: true, passive: true });
    window.addEventListener("pagehide", () => {
      clearTimeout(settleTimer);
      clearTimeout(scrollingTimer);
      cancelProgrammatic();
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(headingFrame);
      noteObserver.disconnect();
      editorObserver.disconnect();
    }, { once: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", begin, { once: true });
  else begin();
})();

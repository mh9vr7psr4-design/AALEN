/* LEN v51 — animate native disclosure height without losing summary semantics. */
(() => {
  "use strict";

  const disclosures = Array.from(
    document.querySelectorAll("#service-intro.services-combined .service-disclosure")
  );
  if (!disclosures.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const easing = "cubic-bezier(.16, 1, .3, 1)";
  const motions = new WeakMap();

  const summaryOf = (details) => details.querySelector(":scope > summary");
  const panelOf = (details) => details.querySelector(":scope > .service-disclosure__panel");
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const setExpandedState = (details, expanded) => {
    const summary = summaryOf(details);
    summary?.setAttribute("aria-expanded", String(expanded));
    details.dataset.disclosureExpanded = String(expanded);
  };

  const clearMotionStyles = (details) => {
    const panel = panelOf(details);
    details.style.removeProperty("height");
    details.style.removeProperty("overflow");
    details.classList.remove(
      "is-disclosure-animating",
      "is-disclosure-opening",
      "is-disclosure-closing"
    );
    panel?.style.removeProperty("opacity");
    panel?.style.removeProperty("transform");
    panel?.style.removeProperty("transition");
  };

  const measureExpandedHeight = (details, fallback) => {
    const savedHeight = details.style.height;
    const savedOverflow = details.style.overflow;
    details.style.height = "auto";
    details.style.overflow = "visible";
    const measured = details.getBoundingClientRect().height;
    details.style.height = savedHeight;
    details.style.overflow = savedOverflow;
    return Math.max(fallback, measured);
  };

  const stopCurrentMotion = (details) => {
    const currentHeight = details.getBoundingClientRect().height;
    const active = motions.get(details);
    if (active?.animation) {
      active.animation.onfinish = null;
      active.animation.oncancel = null;
      active.animation.cancel();
    }
    motions.delete(details);
    return currentHeight;
  };

  const finishMotion = (details, entry) => {
    if (motions.get(details) !== entry) return;

    entry.animation?.cancel();
    if (!entry.expanding) details.open = false;
    clearMotionStyles(details);
    setExpandedState(details, entry.expanding);
    motions.delete(details);
  };

  const animateDisclosure = (details, expanding) => {
    const summary = summaryOf(details);
    const panel = panelOf(details);
    if (!summary) return;

    const currentHeight = Math.max(
      summary.getBoundingClientRect().height,
      stopCurrentMotion(details)
    );
    if (expanding && !details.open) details.open = true;
    if (!expanding && !details.open) {
      setExpandedState(details, false);
      return;
    }

    const targetHeight = expanding
      ? measureExpandedHeight(details, currentHeight)
      : summary.getBoundingClientRect().height;

    setExpandedState(details, expanding);

    if (reducedMotion.matches || typeof details.animate !== "function") {
      if (!expanding) details.open = false;
      clearMotionStyles(details);
      setExpandedState(details, expanding);
      return;
    }

    details.classList.add("is-disclosure-animating");
    details.classList.toggle("is-disclosure-opening", expanding);
    details.classList.toggle("is-disclosure-closing", !expanding);
    details.style.height = currentHeight + "px";
    details.style.overflow = "hidden";

    if (panel) {
      if (expanding) {
        panel.style.transition = "none";
        panel.style.opacity = "0";
        panel.style.transform = "translate3d(0, -10px, 0)";
        panel.getBoundingClientRect();
      } else {
        panel.style.opacity = "1";
        panel.style.transform = "translate3d(0, 0, 0)";
      }
    }

    const distance = Math.abs(targetHeight - currentHeight);
    const duration = expanding
      ? clamp(360 + distance * .34, 540, 800)
      : clamp(270 + distance * .30, 420, 640);

    const animation = details.animate(
      [
        { height: currentHeight + "px" },
        { height: targetHeight + "px" }
      ],
      { duration, easing, fill: "both" }
    );
    const entry = { animation, expanding };
    motions.set(details, entry);

    window.requestAnimationFrame(() => {
      if (motions.get(details) !== entry || !panel) return;
      if (expanding) panel.style.removeProperty("transition");
      panel.style.opacity = expanding ? "1" : "0";
      panel.style.transform = expanding
        ? "translate3d(0, 0, 0)"
        : "translate3d(0, -10px, 0)";
    });

    animation.onfinish = () => finishMotion(details, entry);
  };

  disclosures.forEach((details) => {
    const summary = summaryOf(details);
    if (!summary) return;

    setExpandedState(details, details.open);

    summary.addEventListener("click", (event) => {
      event.preventDefault();

      const active = motions.get(details);
      const currentlyExpanded = active ? active.expanding : details.open;
      animateDisclosure(details, !currentlyExpanded);
    });

    details.addEventListener("toggle", () => {
      if (!motions.has(details)) setExpandedState(details, details.open);
    });
  });

  window.addEventListener("pagehide", () => {
    disclosures.forEach((details) => stopCurrentMotion(details));
  }, { once: true });
})();

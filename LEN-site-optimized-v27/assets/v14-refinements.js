(() => {
  "use strict";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const initEnvelope = () => {
    const overlay = document.getElementById("about-envelope-experience");
    const stage = overlay?.querySelector(".about-envelope-stage");
    const envelope = overlay?.querySelector(".len-envelope");
    const openButton = document.getElementById("about-envelope-open");
    if (!overlay || !stage || !envelope || !openButton) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let tapTimer = 0;
    let touchResetTimer = 0;
    let target = { x: 0, y: 0, lx: 50, ly: 34 };
    let current = { x: 0, y: 0, lx: 50, ly: 34 };

    const paint = () => {
      frame = 0;
      const factor = reduced ? 1 : .18;
      current.x += (target.x - current.x) * factor;
      current.y += (target.y - current.y) * factor;
      current.lx += (target.lx - current.lx) * factor;
      current.ly += (target.ly - current.ly) * factor;

      overlay.style.setProperty("--env-tilt-x", `${current.x.toFixed(2)}deg`);
      overlay.style.setProperty("--env-tilt-y", `${current.y.toFixed(2)}deg`);
      overlay.style.setProperty("--env-light-x", `${current.lx.toFixed(2)}%`);
      overlay.style.setProperty("--env-light-y", `${current.ly.toFixed(2)}%`);

      if (
        Math.abs(target.x - current.x) > .03 ||
        Math.abs(target.y - current.y) > .03 ||
        Math.abs(target.lx - current.lx) > .08 ||
        Math.abs(target.ly - current.ly) > .08
      ) frame = requestAnimationFrame(paint);
    };

    const schedulePaint = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const resetTilt = () => {
      target = { x: 0, y: 0, lx: 50, ly: 34 };
      schedulePaint();
    };

    const setFromPoint = (clientX, clientY, strength = 1) => {
      if (overlay.classList.contains("is-opening")) return;
      const rect = envelope.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const ny = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

      // Hard cap remains below the requested 10 degrees.
      target.x = clamp(-ny * 7.8 * strength, -8.6, 8.6);
      target.y = clamp(nx * 9.1 * strength, -9.4, 9.4);
      target.lx = clamp(50 + nx * 28, 18, 82);
      target.ly = clamp(34 + ny * 20, 14, 72);
      schedulePaint();
    };

    stage.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      setFromPoint(event.clientX, event.clientY, 1);
    }, { passive: true });

    stage.addEventListener("pointerleave", resetTilt, { passive: true });

    envelope.addEventListener("pointerdown", (event) => {
      if (!overlay.classList.contains("is-awaiting-open") || overlay.classList.contains("is-opening")) return;
      // Clicking/touching the envelope only gives physical feedback. It never opens it.
      event.stopPropagation();
      window.clearTimeout(tapTimer);
      window.clearTimeout(touchResetTimer);
      setFromPoint(event.clientX, event.clientY, event.pointerType === "touch" ? .72 : 1);
      overlay.classList.add("is-envelope-tapped");
      tapTimer = window.setTimeout(() => overlay.classList.remove("is-envelope-tapped"), 125);
      if (event.pointerType === "touch") {
        touchResetTimer = window.setTimeout(resetTilt, 460);
      }
    }, { passive: true });

    // Opening is still exclusively owned by the existing OPEN button.
    openButton.addEventListener("pointerdown", () => {
      overlay.classList.remove("is-envelope-tapped");
      resetTilt();
    }, { passive: true });

    window.addEventListener("pagehide", () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(tapTimer);
      window.clearTimeout(touchResetTimer);
    }, { once: true });
  };

  const initBookingTouch = () => {
    const steps = Array.from(document.querySelectorAll(".booking-step"));
    if (!steps.length) return;
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (!coarse) return;

    let timer = 0;
    steps.forEach((step) => {
      step.addEventListener("pointerdown", () => {
        steps.forEach((item) => item !== step && item.classList.remove("is-v14-flipped"));
        step.classList.add("is-v14-flipped");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => step.classList.remove("is-v14-flipped"), 980);
      }, { passive: true });
    });
  };

  const init = () => {
    initEnvelope();
    initBookingTouch();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

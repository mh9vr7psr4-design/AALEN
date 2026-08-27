/* LEN v54 — mobile portrait source and one-shot Bézier service response. */
(() => {
  "use strict";

  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 900px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SVG_NS = "http://www.w3.org/2000/svg";
  const curveTargets = ".service-intro__header, .service-journey article, .service-plan, .service-extra, .service-rules, .makeup-showcase, .service-basics, .service-disclosures";

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const syncPortraitSource = () => {
    const image = document.querySelector("img[data-about-photo][data-mobile-src]");
    if (!image) return;
    const preferred = mobile.matches ? image.dataset.mobileSrc : image.dataset.desktopSrc;
    if (preferred && !image.src.endsWith(preferred)) image.src = preferred;
  };

  const removeLegacyServiceEffects = (section) => {
    section.querySelectorAll(".ink-ripple, .plan-render-field").forEach((node) => node.remove());
    section.querySelectorAll(".plan-float-target, .is-plan-float-tap").forEach((node) => {
      node.classList.remove("plan-float-target", "is-plan-float-tap");
      node.style.removeProperty("--plan-float-x");
      node.style.removeProperty("--plan-float-y");
      node.style.removeProperty("--plan-float-r");
    });
  };

  const createCurve = (target, clientX, clientY) => {
    if (!mobile.matches || reduced.matches || root.classList.contains("editing")) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    target.querySelectorAll(".v54-plan-curve").forEach((node) => node.remove());

    const x = clamp(((clientX - rect.left) / rect.width) * 100, 6, 94);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 10, 90);
    const destinationX = x < 50 ? 88 : 12;
    const destinationY = clamp(y < 46 ? 72 : 24, 16, 84);
    const controlX = clamp((x + destinationX) / 2 + (x < 50 ? 12 : -12), 8, 92);
    const controlY = clamp((y + destinationY) / 2 - 17, 8, 89);

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("v54-plan-curve");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    const createPath = (offsetX, offsetY) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("pathLength", "1");
      path.setAttribute(
        "d",
        `M ${x.toFixed(2)} ${y.toFixed(2)} Q ${(controlX + offsetX).toFixed(2)} ${(controlY + offsetY).toFixed(2)} ${destinationX.toFixed(2)} ${destinationY.toFixed(2)}`
      );
      return path;
    };

    const origin = document.createElementNS(SVG_NS, "circle");
    origin.setAttribute("cx", x.toFixed(2));
    origin.setAttribute("cy", y.toFixed(2));
    origin.setAttribute("r", "1.14");
    svg.append(createPath(0, 0), createPath(x < 50 ? -1.4 : 1.4, 2.2), origin);
    target.append(svg);

    window.requestAnimationFrame(() => svg.classList.add("is-playing"));
    window.setTimeout(() => svg.remove(), 1220);
  };

  const begin = () => {
    syncPortraitSource();
    if (mobile.addEventListener) {
      mobile.addEventListener("change", syncPortraitSource);
    } else if (mobile.addListener) {
      mobile.addListener(syncPortraitSource);
    }

    const section = document.getElementById("service-intro");
    if (!section) return;

    section.addEventListener("pointerdown", (event) => {
      if (!mobile.matches) return;
      const target = event.target.closest?.(curveTargets);
      if (!target || !section.contains(target)) return;
      createCurve(target, event.clientX, event.clientY);
      window.requestAnimationFrame(() => removeLegacyServiceEffects(section));
    }, { capture: true, passive: true });

    section.addEventListener("animationstart", () => {
      if (mobile.matches) removeLegacyServiceEffects(section);
    }, { passive: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", begin, { once: true });
  } else {
    begin();
  }
})();

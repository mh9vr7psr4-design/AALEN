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

  // Only visual media is protected from selection/dragging. Copy remains selectable.
  document.querySelectorAll("img, .media, .work-card").forEach((element) => {
    if (element.tagName === "IMG") element.draggable = false;
  });

  const groups = [
    ["#about", ".about__visual, .about__copy"],
    ["#works", ".works .section-heading"],
    [".manifesto", ".manifesto__inner"],
    ["#booking", ".booking .section-heading, .booking-step"],
    ["#services", ".services .section-heading, .package"],
    ["#service-intro", ".service-intro__header, .service-ball-code-slot, .service-plan, .service-extra, .service-rules, .makeup-showcase"],
    ["#contact", ".contact__lead, .contact-grid > div, .site-footer"]
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
      item.style.setProperty("--stage-depth", String(1 + (itemIndex % 3) * .12));
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
      pointerX = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - .5) * -8;
      pointerY = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - .5) * -5;
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

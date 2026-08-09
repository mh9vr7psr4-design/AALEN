(() => {
  "use strict";

  const root = document.documentElement;
  let raf = 0;

  const syncViewport = () => {
    raf = 0;
    const vv = window.visualViewport;
    const width = Math.max(1, Math.round(vv?.width || window.innerWidth || root.clientWidth || 1));
    const height = Math.max(1, Math.round(vv?.height || window.innerHeight || root.clientHeight || 1));

    root.style.setProperty("--v28-vh", `${height * 0.01}px`);
    root.style.setProperty("--v28-vw", `${width * 0.01}px`);
    root.classList.toggle("v28-phone", width <= 760);
    root.classList.toggle("v28-narrow", width <= 380);
    root.classList.toggle("v28-short", height <= 620);
    root.classList.toggle("v28-landscape-phone", width > height && height <= 620 && width <= 950);
  };

  const queueSync = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(syncViewport);
  };

  syncViewport();
  window.addEventListener("resize", queueSync, { passive: true });
  window.addEventListener("orientationchange", queueSync, { passive: true });
  window.visualViewport?.addEventListener("resize", queueSync, { passive: true });
  window.visualViewport?.addEventListener("scroll", queueSync, { passive: true });
  window.addEventListener("pageshow", queueSync, { passive: true });
})();

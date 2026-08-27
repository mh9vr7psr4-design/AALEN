/* LEN v53 — robust mobile hydration and empty-group guard. */
(() => {
  "use strict";

  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 900px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const userAgent = navigator.userAgent || "";
  const wechat = /MicroMessenger/i.test(userAgent);
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const lowData = Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType || "");

  if (wechat) root.classList.add("v53-wechat");
  if (lowData || reduced.matches) root.classList.add("v53-low-motion");

  const workCards = () => Array.from(document.querySelectorAll("#works .work-card"));
  const hasImage = (card) => {
    const image = card.querySelector("img[data-photo]");
    return Boolean(image && !image.hidden && image.getAttribute("src"));
  };

  const syncEmptyGroups = () => {
    const editing = root.classList.contains("editing");
    workCards().forEach((card) => {
      const empty = card.dataset.emptySlot === "true" || !hasImage(card);
      card.classList.toggle("v53-empty-group", empty);
      if (empty && !editing) {
        card.removeAttribute("data-exhibit-active");
        card.removeAttribute("data-depth-current");
        card.setAttribute("aria-hidden", "true");
      }
    });
  };

  const makeImagesCheapUntilNeeded = () => {
    const images = Array.from(document.images);
    images.forEach((image) => {
      image.decoding = "async";
      if (image.closest(".hero")) return;
      if (!image.loading) image.loading = "lazy";
      if (image.fetchPriority === "high") image.fetchPriority = "low";
    });

    const firstWork = document.querySelector("#works .work-card:not([data-empty-slot='true']) img[data-photo]");
    if (firstWork) firstWork.fetchPriority = "auto";
  };

  const giveTapFeedback = () => {
    const targets = document.querySelectorAll(
      "#works .work-card, #service-intro .plan-choice button, #service-intro .plan-details-toggle, #contact .contact-copy-option"
    );
    targets.forEach((target) => {
      let timer = 0;
      target.addEventListener("pointerdown", () => {
        if (!mobile.matches) return;
        target.classList.add("v53-tap");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => target.classList.remove("v53-tap"), 360);
      }, { passive: true });
      target.addEventListener("pointercancel", () => target.classList.remove("v53-tap"), { passive: true });
    });
  };

  const revealFailsafe = () => {
    if (!mobile.matches) return;
    window.setTimeout(() => {
      document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.6) node.classList.add("is-visible");
      });
    }, 1800);
  };

  const pauseWhenHidden = () => {
    document.addEventListener("visibilitychange", () => {
      root.classList.toggle("v53-page-hidden", document.hidden);
    }, { passive: true });
  };

  const begin = () => {
    syncEmptyGroups();
    makeImagesCheapUntilNeeded();
    giveTapFeedback();
    revealFailsafe();
    pauseWhenHidden();
    root.classList.add("v53-ready");

    new MutationObserver(syncEmptyGroups).observe(root, {
      attributes: true,
      attributeFilter: ["class"]
    });

    document.addEventListener("len:works-changed", syncEmptyGroups, { passive: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", begin, { once: true });
  } else {
    begin();
  }
})();

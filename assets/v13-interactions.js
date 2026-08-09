(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const portrait = document.querySelector("[data-portrait-card]");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  if (portrait && !reducedMotion) {
    let frame = 0;
    let resetTimer = 0;

    const applyTilt = (clientX, clientY, touch = false) => {
      const bounds = portrait.getBoundingClientRect();
      const x = clamp((clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
      const y = clamp((clientY - bounds.top) / Math.max(1, bounds.height), 0, 1);
      const qualityLow = root.classList.contains("quality-low") || root.classList.contains("spatial-tier-low");
      const maxY = touch ? 6.4 : qualityLow ? 6.8 : 8.8;
      const maxX = touch ? 5.4 : qualityLow ? 5.8 : 7.6;
      const maxZ = touch ? .7 : 1.25;
      const shift = touch ? 1.8 : qualityLow ? 2.2 : 3.4;
      const nx = (x - .5) * 2;
      const ny = (y - .5) * 2;

      portrait.style.setProperty("--portrait-x", `${(x * 100).toFixed(2)}%`);
      portrait.style.setProperty("--portrait-y", `${(y * 100).toFixed(2)}%`);
      portrait.style.setProperty("--portrait-tilt-y", `${(nx * maxY).toFixed(2)}deg`);
      portrait.style.setProperty("--portrait-tilt-x", `${(-ny * maxX).toFixed(2)}deg`);
      portrait.style.setProperty("--portrait-tilt-z", `${(nx * -maxZ).toFixed(2)}deg`);
      portrait.style.setProperty("--portrait-shift-x", `${(nx * shift).toFixed(2)}px`);
      portrait.style.setProperty("--portrait-shift-y", `${(ny * shift * .62).toFixed(2)}px`);
      portrait.classList.add("is-portrait-active", "is-len-portrait-interacting");
    };

    const scheduleTilt = (clientX, clientY, touch = false) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => applyTilt(clientX, clientY, touch));
    };

    const resetTilt = (delay = 0) => {
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        window.cancelAnimationFrame(frame);
        portrait.style.setProperty("--portrait-x", "50%");
        portrait.style.setProperty("--portrait-y", "50%");
        portrait.style.setProperty("--portrait-tilt-x", "0deg");
        portrait.style.setProperty("--portrait-tilt-y", "0deg");
        portrait.style.setProperty("--portrait-tilt-z", "0deg");
        portrait.style.setProperty("--portrait-shift-x", "0px");
        portrait.style.setProperty("--portrait-shift-y", "0px");
        portrait.classList.remove("is-portrait-active", "is-len-portrait-interacting");
      }, delay);
    };

    if (finePointer) {
      portrait.addEventListener("pointerenter", (event) => scheduleTilt(event.clientX, event.clientY, false), { passive: true });
      portrait.addEventListener("pointermove", (event) => scheduleTilt(event.clientX, event.clientY, false), { passive: true });
      portrait.addEventListener("pointerleave", () => resetTilt(0), { passive: true });
    }

    portrait.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && finePointer) return;
      scheduleTilt(event.clientX, event.clientY, true);
      resetTilt(620);
    }, { passive: true });

    portrait.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "mouse") resetTilt(260);
    }, { passive: true });
    portrait.addEventListener("pointercancel", () => resetTilt(0), { passive: true });

    window.addEventListener("pagehide", () => {
      window.clearTimeout(resetTimer);
      window.cancelAnimationFrame(frame);
    }, { once: true });
  }

  const works = document.getElementById("works");
  if (!works) return;

  const hudTitle = document.getElementById("works-exhibit-title");
  const titleNodes = Array.from(works.querySelectorAll(".work-card[data-work-id] h3[data-work-title]"));

  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();

  const syncTitle = (titleNode) => {
    const card = titleNode.closest(".work-card[data-work-id]");
    if (!card) return;
    const fallback = card.dataset.exhibitTitle || `作品 ${card.dataset.reservedGroup || ""}`.trim();
    const title = normalize(titleNode.textContent) || fallback;
    if (!normalize(titleNode.textContent)) titleNode.textContent = title;
    card.dataset.exhibitTitle = title;

    const media = card.querySelector("[data-image-slot]");
    const image = card.querySelector("[data-photo]");
    const count = Number(media?.dataset.galleryCount || 0);
    if (image && !image.hidden) image.alt = `${title} 摄影作品`;
    if (media && count > 0) {
      media.setAttribute(
        "aria-label",
        count > 1 ? `${title}，点击进入${count}张组图页面` : `${title}，点击进入作品页面`
      );
    }
    if (card.hasAttribute("data-exhibit-active") && hudTitle) hudTitle.textContent = title;
  };

  titleNodes.forEach((titleNode) => {
    syncTitle(titleNode);
    titleNode.addEventListener("input", () => syncTitle(titleNode));
    titleNode.addEventListener("blur", () => syncTitle(titleNode));
    titleNode.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      titleNode.blur();
    });
  });
})();

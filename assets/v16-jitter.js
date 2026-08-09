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
      // Force a reflow only on explicit interaction so the animation can retrigger reliably.
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

    // Each time the selected work changes, its title/description gets one short wake-up shake.
    if (title) {
      const titleObserver = new MutationObserver(pulseHud);
      titleObserver.observe(title, { childList: true, characterData: true, subtree: true });
      window.addEventListener("pagehide", () => titleObserver.disconnect(), { once: true });
    }

    // Touch devices have no hover, so touching relevant copy triggers the same restrained feedback.
    const touchTargets = [
      ...(intro ? intro.querySelectorAll(".eyebrow, h2, span") : []),
      ...(hud ? hud.querySelectorAll("strong, p") : [])
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
    // v18: works copy now uses the PLAN-style floating interaction.
    // initWorksCopyJitter();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

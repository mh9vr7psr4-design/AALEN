/* LEN v55 — remove legacy mobile motion state and keep the native rail exact. */
(() => {
  "use strict";

  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 900px)");
  if (!mobile.matches) return;

  const clearAboutOverlay = () => {
    document.querySelectorAll(".about-letter-preview, .v54-plan-curve").forEach((node) => node.remove());
    const overlay = document.getElementById("about-envelope-experience");
    if (overlay) {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      overlay.className = "about-envelope-experience";
    }
    const about = document.getElementById("about");
    about?.classList.remove(
      "is-about-story-awaiting",
      "is-about-letter-unfolding",
      "is-about-origin-rising",
      "is-about-preview-target"
    );
    about?.classList.add("about-story-complete", "is-about-letter-open");
    root.classList.remove("about-story-lock", "about-story-active");
  };

  const stabilizeWorks = () => {
    const section = document.getElementById("works");
    const grid = section?.querySelector(".works-grid");
    const sticky = section?.querySelector(".works-exhibit__sticky");
    if (!section || !grid) return;

    sticky?.classList.remove(
      "is-page-turning",
      "is-awaiting-second",
      "is-stage-focused",
      "is-mobile-direct-focus",
      "is-copy-hidden",
      "is-switching",
      "is-releasing",
      "is-initializing",
      "is-dual-handoff",
      "is-gesture-active"
    );

    const cards = Array.from(grid.querySelectorAll(".work-card")).filter((card) => {
      const image = card.querySelector("img[data-photo]");
      return Boolean(image && !image.hidden && image.getAttribute("src"));
    });

    cards.forEach((card) => {
      card.removeAttribute("data-depth-state");
      card.removeAttribute("data-depth-outgoing");
      card.removeAttribute("data-depth-incoming");
      card.removeAttribute("data-depth-instant");
      card.removeAttribute("data-spatial-stage");
      card.classList.remove("works-v18-float", "plan-float-target", "is-plan-float-tap");
      [
        "--depth-x", "--depth-y", "--depth-scale", "--depth-opacity", "--depth-blur",
        "--depth-saturate", "--v45-swipe-drift", "--stage-depth", "z-index", "pointer-events"
      ].forEach((name) => card.style.removeProperty(name));
    });

    const centerCard = (card) => {
      if (!card) return;
      const left = card.offsetLeft - (grid.clientWidth - card.offsetWidth) / 2;
      grid.scrollTo({ left: Math.max(0, left), behavior: "auto" });
    };

    const cancelLegacyAnimations = () => {
      if (typeof section.getAnimations !== "function") return;
      section.getAnimations({ subtree: true }).forEach((animation) => {
        const target = animation.effect?.target;
        if (target?.closest?.(".work-card, .works-exhibit__scene, .works-touch-aura")) {
          animation.cancel();
        }
      });
    };

    const nearestCard = () => {
      const center = grid.scrollLeft + grid.clientWidth / 2;
      return cards.reduce((nearest, card) => {
        const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
        return !nearest || distance < nearest.distance ? { card, distance } : nearest;
      }, null)?.card;
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        cancelLegacyAnimations();
        centerCard(cards[0]);
      });
    });

    const reCenter = () => window.requestAnimationFrame(() => centerCard(nearestCard() || cards[0]));
    window.addEventListener("orientationchange", reCenter, { passive: true });
    window.addEventListener("pageshow", () => {
      clearAboutOverlay();
      cancelLegacyAnimations();
      reCenter();
    }, { passive: true });

    const runMobileCheck = () => {
      const card = nearestCard() || cards[0];
      if (!card) return;
      const gridRect = grid.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const centerError = Math.abs((cardRect.left + cardRect.width / 2) - (gridRect.left + gridRect.width / 2));
      if (centerError > 1.25) centerCard(card);
      window.requestAnimationFrame(() => {
        const checkedGrid = grid.getBoundingClientRect();
        const checkedCard = card.getBoundingClientRect();
        const checkedError = Math.abs(
          (checkedCard.left + checkedCard.width / 2) - (checkedGrid.left + checkedGrid.width / 2)
        );
        const noPageOverflow = document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1;
        const portraitClean = document.querySelector("#about img[data-about-photo]")?.getAttribute("src")?.endsWith("about-mobile-hq.webp");
        const passed = checkedError <= 1.25 && noPageOverflow && Boolean(portraitClean);
        root.dataset.v55MobileCheck = passed ? "pass" : "guarded";
        root.style.setProperty("--v55-center-error", `${checkedError.toFixed(2)}px`);
      });
    };

    window.addEventListener("load", runMobileCheck, { once: true, passive: true });
    cards[0]?.querySelector("img[data-photo]")?.decode?.().then(runMobileCheck).catch(runMobileCheck);
  };

  const begin = () => {
    root.classList.add("v55-mobile-stable");
    clearAboutOverlay();
    stabilizeWorks();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", begin, { once: true });
  } else {
    begin();
  }
})();

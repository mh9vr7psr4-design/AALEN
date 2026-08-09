(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  document.addEventListener("touchstart", () => {
    root.classList.add("len-touch");
  }, { passive: true, once: true });

  const liftBriefly = (element, className, duration = 640) => {
    if (!element || reducedMotion) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), duration);
  };

  // The About section rises toward the visitor instead of simply appearing below the fold.
  const about = document.getElementById("about");
  if (about) {
    about.classList.add("about-rise-managed");
    if (reducedMotion || !("IntersectionObserver" in window)) {
      about.classList.add("is-about-risen");
    } else {
      const aboutObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          about.classList.add("is-about-risen");
          aboutObserver.unobserve(about);
        });
      }, { threshold: .12, rootMargin: "0px 0px -7% 0px" });
      aboutObserver.observe(about);
    }
  }

  const statement = document.querySelector(".hero__statement");
  if (statement) {
    let titleFrame = 0;
    let titleX = 0;
    let titleY = 0;

    const paintTitle = () => {
      titleFrame = 0;
      statement.style.setProperty("--statement-x", `${titleX.toFixed(2)}px`);
      statement.style.setProperty("--statement-y", `${titleY.toFixed(2)}px`);
    };

    if (finePointer && !reducedMotion) {
      statement.addEventListener("pointerenter", () => statement.classList.add("is-energized"), { passive: true });
      statement.addEventListener("pointermove", (event) => {
        const bounds = statement.getBoundingClientRect();
        titleX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - .5) * 7;
        titleY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - .5) * 5;
        if (!titleFrame) titleFrame = window.requestAnimationFrame(paintTitle);
      }, { passive: true });
      statement.addEventListener("pointerleave", () => {
        statement.classList.remove("is-energized");
        titleX = 0;
        titleY = 0;
        if (!titleFrame) titleFrame = window.requestAnimationFrame(paintTitle);
      }, { passive: true });
    }

    statement.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      liftBriefly(statement, "is-touch-lift", 700);
    }, { passive: true });
  }

  // Only the visible work's story responds; it rises on hover and gives a gentle touch pulse on phones.
  const exhibitHud = document.querySelector(".works-exhibit__hud");
  if (exhibitHud) {
    if (finePointer && !reducedMotion) {
      exhibitHud.addEventListener("pointerenter", () => exhibitHud.classList.add("is-copy-lifted"), { passive: true });
      exhibitHud.addEventListener("pointerleave", () => exhibitHud.classList.remove("is-copy-lifted"), { passive: true });
    }
    exhibitHud.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      liftBriefly(exhibitHud, "is-touch-lift", 620);
    }, { passive: true });
  }

  const exhibit = document.getElementById("works-exhibit-scroll");
  if (exhibit) {
    exhibit.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      const activeCard = exhibit.querySelector(".work-card[data-exhibit-active]");
      if (activeCard) liftBriefly(activeCard, "is-touch-lift", 520);
    }, { passive: true });
  }

  window.addEventListener("pagehide", () => {
    if (statement) {
      statement.style.removeProperty("--statement-x");
      statement.style.removeProperty("--statement-y");
    }
  }, { passive: true });
})();

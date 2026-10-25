(() => {
      "use strict";
      const section = document.getElementById("service-intro");
      if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const selector = [
        "[data-edit]",
        ".service-plan__top span",
        ".service-plan__price",
        ".service-plan li",
        ".service-extra p",
        ".service-rules p",
        ".makeup-showcase figcaption"
      ].join(",");
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      let active = null;
      let tapTimer = 0;

      const reset = (target) => {
        if (!target) return;
        target.classList.remove("plan-float-target", "is-plan-float-tap");
        target.style.removeProperty("--plan-float-x");
        target.style.removeProperty("--plan-float-y");
        target.style.removeProperty("--plan-float-r");
      };

      const activate = (target, clientX, clientY, tap = false) => {
        if (!target || !section.contains(target)) return;
        if (active && active !== target) reset(active);
        active = target;
        const rect = target.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / Math.max(1, rect.width) - .5) * 2));
        const ny = Math.max(-1, Math.min(1, ((clientY - rect.top) / Math.max(1, rect.height) - .5) * 2));
        target.style.setProperty("--plan-float-x", `${(nx * 3.2).toFixed(2)}px`);
        target.style.setProperty("--plan-float-y", `${(ny * 1.6).toFixed(2)}px`);
        target.style.setProperty("--plan-float-r", `${(nx * .22).toFixed(2)}deg`);
        target.classList.add("plan-float-target");
        target.classList.toggle("is-plan-float-tap", tap);
      };

      if (finePointer) {
        section.addEventListener("pointermove", (event) => {
          const target = event.target.closest?.(selector);
          if (!target) {
            reset(active);
            active = null;
            return;
          }
          activate(target, event.clientX, event.clientY, false);
        }, { passive: true });
        section.addEventListener("pointerleave", () => {
          reset(active);
          active = null;
        }, { passive: true });
      }

      section.addEventListener("pointerdown", (event) => {
        const target = event.target.closest?.(selector);
        if (!target) return;
        window.clearTimeout(tapTimer);
        activate(target, event.clientX, event.clientY, true);
        tapTimer = window.setTimeout(() => {
          reset(target);
          if (active === target) active = null;
        }, 520);
      }, { passive: true });

      window.addEventListener("pagehide", () => {
        window.clearTimeout(tapTimer);
        reset(active);
        active = null;
      }, { once: true });
    })();

(() => {
      "use strict";
      const root = document.documentElement;
      const section = document.getElementById("contact");
      if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const selector = [
        ".contact__lead > .eyebrow",
        ".contact-title__line",
        ".contact__lead > p:last-child",
        ".contact-grid > div > span",
        ".contact-grid > div > p",
        ".contact-grid .contact-action",
        ".contact-copy-picker__heading > p",
        ".contact-copy-picker__heading > h3",
        ".contact-copy-picker__heading > span",
        ".contact-copy-option > span",
        ".contact-copy-option > strong",
        ".contact-copy-option > p",
        ".contact-copy-option > i"
      ].join(",");
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const quadratic = (t, start, control, end) => {
        const inverse = 1 - t;
        return inverse * inverse * start + 2 * inverse * t * control + t * t * end;
      };
      let active = null;
      let tapTimer = 0;

      const reset = (target) => {
        if (!target) return;
        target.classList.remove("contact-float-target", "is-contact-float-tap");
        target.style.removeProperty("--contact-float-x");
        target.style.removeProperty("--contact-float-y");
        target.style.removeProperty("--contact-float-r");
      };

      const activate = (target, clientX, clientY, tap = false) => {
        if (!target || !section.contains(target) || root.classList.contains("editing")) {
          reset(active);
          active = null;
          return;
        }
        if (active && active !== target) reset(active);
        active = target;

        const rect = target.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, ((clientX - rect.left) / Math.max(1, rect.width) - .5) * 2));
        const ny = Math.max(-1, Math.min(1, ((clientY - rect.top) / Math.max(1, rect.height) - .5) * 2));
        const t = Math.min(1, Math.hypot(nx, ny));
        const endX = nx * 7.2;
        const endY = ny * 2.6 - 1.2;
        const controlX = endX * .58;
        const controlY = -6.2 - Math.abs(ny) * 1.2;
        const x = quadratic(t, 0, controlX, endX);
        const y = quadratic(t, 0, controlY, endY);
        const rotation = quadratic(t, 0, nx * .18, nx * .34);

        target.style.setProperty("--contact-float-x", `${x.toFixed(2)}px`);
        target.style.setProperty("--contact-float-y", `${y.toFixed(2)}px`);
        target.style.setProperty("--contact-float-r", `${rotation.toFixed(2)}deg`);
        target.classList.add("contact-float-target");
        target.classList.toggle("is-contact-float-tap", tap);
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
        }, 640);
      }, { passive: true });

      window.addEventListener("pagehide", () => {
        window.clearTimeout(tapTimer);
        reset(active);
        active = null;
      }, { once: true });
    })();

(() => {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const init = () => {
    const root = document.documentElement;
    const hero = document.getElementById("top");
    const title = hero?.querySelector(".hero__statement");
    const media = hero?.querySelector(".hero__media");
    const copy = hero?.querySelector(".hero__copy");
    if (!hero || !title || !media || !copy) return;

    const experience = window.LENExperience || {
      quality: "medium",
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      pointer: { x: 0, y: 0 }
    };

    const wrapLine = (line) => {
      if (line.querySelector(".wave-letter")) return;
      const text = line.textContent || "";
      line.textContent = "";
      Array.from(text).forEach((character, index) => {
        const letter = document.createElement("span");
        letter.className = "wave-letter";
        letter.dataset.waveIndex = String(index);
        letter.textContent = character === " " ? "\u00a0" : character;
        letter.setAttribute("aria-hidden", "true");
        line.appendChild(letter);
      });
      line.setAttribute("aria-label", text);
    };

    Array.from(title.children).forEach((line) => wrapLine(line));
    const letters = Array.from(title.querySelectorAll(".wave-letter"));
    const states = letters.map(() => ({ y: 0, velocity: 0, target: 0 }));
    let centers = [];
    let pointerInside = false;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let scrollDepth = 0;
    let frame = 0;
    let lastTime = performance.now();

    const config = () => {
      const quality = experience.quality || root.dataset.quality || "medium";
      const mobile = window.matchMedia("(hover: none), (pointer: coarse)").matches;
      if (experience.reducedMotion) return { x: 0, y: 0, wave: 0, radius: 1 };
      if (quality === "high") return mobile
        ? { x: 18, y: 11, wave: 8, radius: 120 }
        : { x: clamp(window.innerWidth * .027, 28, 46), y: clamp(window.innerHeight * .026, 16, 29), wave: 17, radius: 190 };
      if (quality === "medium") return mobile
        ? { x: 13, y: 8, wave: 6, radius: 105 }
        : { x: clamp(window.innerWidth * .021, 22, 35), y: clamp(window.innerHeight * .019, 13, 22), wave: 12, radius: 160 };
      return mobile
        ? { x: 7, y: 4, wave: 4, radius: 82 }
        : { x: 16, y: 10, wave: 7, radius: 120 };
    };

    const measureLetters = () => {
      centers = letters.map((letter) => {
        const bounds = letter.getBoundingClientRect();
        return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
      });
    };

    const setWaveTargets = (time) => {
      const settings = config();
      states.forEach((state, index) => {
        if (!pointerInside || !centers[index] || settings.wave === 0) {
          state.target = 0;
          return;
        }
        const dx = pointerX - centers[index].x;
        const dy = pointerY - centers[index].y;
        const distance = Math.hypot(dx, dy * .72);
        const influence = clamp(1 - distance / settings.radius, 0, 1);
        const liquidPhase = distance * .055 - time * .0043;
        state.target = Math.sin(liquidPhase) * settings.wave * influence * influence;
      });
    };

    const render = (time) => {
      frame = 0;
      const delta = clamp((time - lastTime) / 16.67, .45, 2.2);
      lastTime = time;
      const settings = config();
      setWaveTargets(time);

      currentX += (targetX - currentX) * (.075 * delta);
      currentY += (targetY - currentY) * (.075 * delta);
      const scrollY = -scrollDepth * Math.min(window.innerHeight * .12, 108);
      const scrollScale = 1.085 - scrollDepth * .075;

      hero.style.setProperty("--len-hero-image-x", `${currentX.toFixed(2)}px`);
      hero.style.setProperty("--len-hero-image-y", `${(currentY + scrollY).toFixed(2)}px`);
      hero.style.setProperty("--len-hero-image-scale", scrollScale.toFixed(4));
      hero.style.setProperty("--len-hero-bg-x", `${(currentX * .22).toFixed(2)}px`);
      hero.style.setProperty("--len-hero-bg-y", `${(currentY * .18 + scrollY * .16).toFixed(2)}px`);
      hero.style.setProperty("--len-hero-mid-x", `${(currentX * .54).toFixed(2)}px`);
      hero.style.setProperty("--len-hero-mid-y", `${(currentY * .48 + scrollY * .42).toFixed(2)}px`);
      hero.style.setProperty("--len-hero-copy-x", `${(currentX * -.16).toFixed(2)}px`);
      hero.style.setProperty("--len-hero-copy-y", `${(currentY * -.12 + scrollY * .62).toFixed(2)}px`);

      let moving = Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .06;
      states.forEach((state, index) => {
        const force = (state.target - state.y) * .14;
        state.velocity = (state.velocity + force * delta) * Math.pow(.76, delta);
        state.y += state.velocity * delta;
        if (Math.abs(state.target - state.y) + Math.abs(state.velocity) > .035) moving = true;
        const letter = letters[index];
        letter.style.setProperty("--wave-y", `${state.y.toFixed(2)}px`);
        letter.style.setProperty("--wave-r", `${(state.y * -.055).toFixed(2)}deg`);
        letter.style.setProperty("--wave-sy", `${(1 + Math.abs(state.y) * .0045).toFixed(4)}`);
      });

      experience.pointer.x = currentX / Math.max(settings.x, 1);
      experience.pointer.y = currentY / Math.max(settings.y, 1);
      if (moving || pointerInside) frame = window.requestAnimationFrame(render);
    };

    const schedule = () => {
      if (!frame) {
        lastTime = performance.now();
        frame = window.requestAnimationFrame(render);
      }
    };

    const updatePointer = (event) => {
      const bounds = hero.getBoundingClientRect();
      const settings = config();
      const normalizedX = clamp((event.clientX - bounds.left) / Math.max(bounds.width, 1) - .5, -.5, .5) * 2;
      const normalizedY = clamp((event.clientY - bounds.top) / Math.max(bounds.height, 1) - .5, -.5, .5) * 2;
      pointerX = event.clientX;
      pointerY = event.clientY;
      targetX = normalizedX * settings.x;
      targetY = normalizedY * settings.y;
      pointerInside = true;
      root.classList.toggle("len-wave-active", title.matches(":hover") || event.pointerType !== "mouse");
      schedule();
    };

    const resetPointer = () => {
      pointerInside = false;
      targetX = 0;
      targetY = 0;
      root.classList.remove("len-wave-active");
      schedule();
    };

    const syncScroll = () => {
      const bounds = hero.getBoundingClientRect();
      scrollDepth = clamp(-bounds.top / Math.max(bounds.height, 1), 0, 1);
      schedule();
    };

    hero.addEventListener("pointermove", updatePointer, { passive: true });
    hero.addEventListener("pointerleave", resetPointer, { passive: true });
    hero.addEventListener("pointercancel", resetPointer, { passive: true });
    hero.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "mouse") window.setTimeout(resetPointer, 420);
    }, { passive: true });
    title.addEventListener("pointerenter", () => {
      measureLetters();
      root.classList.add("len-wave-active");
      pointerInside = true;
      schedule();
    }, { passive: true });
    title.addEventListener("pointerleave", resetPointer, { passive: true });
    window.addEventListener("scroll", syncScroll, { passive: true });
    window.addEventListener("resize", () => {
      measureLetters();
      syncScroll();
    }, { passive: true });
    window.addEventListener("len:qualitychange", schedule);

    measureLetters();
    syncScroll();
    root.classList.add("len-hero-interaction-ready");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

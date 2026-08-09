(() => {
  "use strict";

  const root = document.documentElement;
  const section = document.getElementById("service-intro");
  const canvas = document.getElementById("plan-fireflies");
  const music = document.getElementById("background-music");
  const context = canvas?.getContext("2d", { alpha: true, desynchronized: true });
  if (!section || !canvas || !context) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const quality = root.dataset.quality || "medium";
  // V27: denser baseline so the upward gold current remains visible through the full plans section.
  const baseParticles = quality === "high" ? 68 : quality === "low" ? 20 : 48;
  const hoverExtra = quality === "high" ? 46 : quality === "low" ? 14 : 32;
  const burstCount = quality === "high" ? 30 : quality === "low" ? 9 : 20;
  const maxDpr = quality === "high" ? 1.35 : quality === "low" ? 1 : 1.15;
  const cards = Array.from(section.querySelectorAll(
    ".service-plan, .service-extra, .service-rules, .makeup-showcase"
  ));

  const particles = [];
  let width = 1;
  let height = 1;
  let active = false;
  let frame = 0;
  let lastTime = 0;
  let inactiveSince = 0;
  let focusCard = null;
  let touchBoostUntil = 0;

  const random = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);
  const currentLimit = () => baseParticles + ((focusCard || performance.now() < touchBoostUntil) ? hoverExtra : 0);

  const resize = () => {
    if (!active && canvas.width > 1) return;
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width || window.innerWidth));
    const nextHeight = Math.max(1, Math.round(bounds.height || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    width = nextWidth;
    height = nextHeight;
    canvas.width = Math.round(nextWidth * dpr);
    canvas.height = Math.round(nextHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const getCardPoint = (card) => {
    if (!card) return null;
    const canvasRect = canvas.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const localTop = cardRect.top - canvasRect.top;
    const localBottom = cardRect.bottom - canvasRect.top;
    return {
      x: Math.max(0, Math.min(width, cardRect.left - canvasRect.left + cardRect.width * .5)),
      // Spawn near the lower edge so boosted particles visibly rise through the selected plan.
      y: Math.max(0, Math.min(height + 24, localBottom - cardRect.height * .08)),
      top: Math.max(0, Math.min(height, localTop)),
      spreadX: Math.min(cardRect.width * .46, width * .24),
      spreadY: Math.min(cardRect.height * .14, height * .06)
    };
  };

  const makeAmbientParticle = (initial = false) => {
    const life = random(7.2, 12.8);
    return {
      kind: "ambient",
      // Initial fill occupies the full visible column; all replacements are born at the bottom.
      x: random(width * .03, width * .97),
      y: initial ? random(height * .04, height * 1.02) : random(height * .92, height * 1.07),
      vx: random(-5.5, 5.5),
      vy: random(-66, -34),
      radius: random(.78, 2.25),
      alpha: random(.28, .62),
      phase: random(0, Math.PI * 2),
      wave: random(.62, 1.5),
      life,
      age: initial ? random(0, life * .82) : 0
    };
  };

  const makeFocusParticle = (card, immediate = false) => {
    const point = getCardPoint(card) || { x: width * .5, y: height * .82, spreadX: width * .16, spreadY: 36 };
    const life = random(3.8, 7.2);
    return {
      kind: "focus",
      x: point.x + random(-point.spreadX, point.spreadX),
      y: point.y + random(-point.spreadY, point.spreadY * .7),
      vx: random(-8, 8),
      vy: random(-104, -54),
      radius: random(1.05, 2.9),
      alpha: random(.42, .8),
      phase: random(0, Math.PI * 2),
      wave: random(.9, 1.9),
      life,
      age: immediate ? random(0, life * .14) : 0
    };
  };

  const fillParticles = () => {
    while (particles.length < baseParticles) particles.push(makeAmbientParticle(true));
  };

  const burstAt = (card, count = burstCount) => {
    if (!active) return;
    const limit = baseParticles + hoverExtra;
    for (let index = 0; index < count && particles.length < limit; index += 1) {
      particles.push(makeFocusParticle(card, true));
    }
    if (!frame) frame = window.requestAnimationFrame(render);
  };

  const getMusicEnergy = () => {
    if (!music || music.paused) return 0;
    const time = music.currentTime || 0;
    return .045 + (Math.sin(time * 2.2) + 1) * .016 + (Math.sin(time * .73) + 1) * .008;
  };

  const render = (time) => {
    frame = 0;
    const delta = Math.min(.034, Math.max(.001, (time - (lastTime || time)) / 1000));
    lastTime = time;
    context.clearRect(0, 0, width, height);

    const limit = currentLimit();
    const isBoosted = limit > baseParticles;
    if (active && particles.length < limit) {
      const chance = isBoosted ? .82 : .52;
      if (Math.random() < chance) {
        particles.push(isBoosted && focusCard ? makeFocusParticle(focusCard) : makeAmbientParticle(false));
      }
    }

    const energy = getMusicEnergy();
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += delta;
      particle.phase += delta * particle.wave;
      const focus = particle.kind === "focus";

      // V27 direction: vertical lift first, only a restrained side-to-side drift.
      particle.x += (particle.vx + Math.sin(particle.phase * (focus ? 2.2 : 1.55)) * (focus ? 7.5 : 4.2)) * delta;
      particle.y += (particle.vy + Math.cos(particle.phase * (focus ? 1.65 : 1.18)) * (focus ? 3.8 : 2.4)) * delta;

      if (particle.age >= particle.life || particle.x > width + 44 || particle.x < -44 || particle.y < -56) {
        particles.splice(index, 1);
        if (active && particles.length < limit) {
          particles.push(isBoosted && focusCard ? makeFocusParticle(focusCard) : makeAmbientParticle(false));
        }
        continue;
      }

      const progress = particle.age / particle.life;
      const fadeIn = Math.min(1, progress / (focus ? .07 : .1));
      const fadeOut = Math.min(1, (1 - progress) / (focus ? .18 : .2));
      const alpha = particle.alpha * fadeIn * fadeOut
        * (.88 + Math.sin(particle.phase * 3.1) * .1 + energy * .42);
      if (alpha <= .004) continue;

      const radius = particle.radius * (1 + energy * .32 + Math.sin(particle.phase * 2.6) * .06);
      const x = particle.x + Math.sin(particle.phase * 3.8) * (focus ? 1 : .5);
      const y = particle.y;
      const glowScale = focus ? 5.7 : 5.05;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius * glowScale);
      gradient.addColorStop(0, `rgba(255, 251, 226, ${Math.min(.92, alpha * 1.62)})`);
      gradient.addColorStop(.18, `rgba(244, 210, 132, ${Math.min(.8, alpha * 1.2)})`);
      gradient.addColorStop(.52, `rgba(198, 143, 59, ${alpha * .56})`);
      gradient.addColorStop(1, "rgba(126, 78, 25, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius * glowScale, 0, Math.PI * 2);
      context.fill();
    }

    if (active || performance.now() - inactiveSince < 850) {
      frame = window.requestAnimationFrame(render);
    } else {
      context.clearRect(0, 0, width, height);
      particles.length = 0;
      lastTime = 0;
      canvas.width = 1;
      canvas.height = 1;
    }
  };

  const setActive = (nextActive) => {
    if (active === nextActive) return;
    active = nextActive;
    section.classList.toggle("is-fireflies-active", active);
    if (active) {
      resize();
      fillParticles();
      inactiveSince = 0;
      if (!frame) frame = window.requestAnimationFrame(render);
    } else {
      focusCard = null;
      inactiveSince = performance.now();
      if (!frame) frame = window.requestAnimationFrame(render);
    }
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => setActive(entry.isIntersecting && entry.intersectionRatio >= .035));
  }, { threshold: [.035, .1], rootMargin: "14% 0px 14% 0px" });
  observer.observe(section);

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  cards.forEach((card) => {
    if (finePointer) {
      card.addEventListener("pointerenter", () => {
        focusCard = card;
        burstAt(card);
      }, { passive: true });
      card.addEventListener("pointerleave", () => {
        if (focusCard === card) focusCard = null;
      }, { passive: true });
    } else {
      card.addEventListener("pointerdown", () => {
        focusCard = card;
        touchBoostUntil = performance.now() + 1450;
        burstAt(card, Math.max(6, Math.round(burstCount * .86)));
        window.setTimeout(() => {
          if (performance.now() >= touchBoostUntil && focusCard === card) focusCard = null;
        }, 1500);
      }, { passive: true });
    }
  });

  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(() => active && resize()) : null;
  resizeObserver?.observe(canvas);
  window.addEventListener("resize", () => active && resize(), { passive: true });
  window.addEventListener("orientationchange", () => active && resize(), { passive: true });

  window.addEventListener("pagehide", () => {
    observer.disconnect();
    resizeObserver?.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    particles.length = 0;
    canvas.width = 1;
    canvas.height = 1;
  }, { once: true });
})();

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
  const maxParticles = quality === "high" ? 22 : quality === "low" ? 6 : 14;
  const maxDpr = quality === "high" ? 1.35 : quality === "low" ? 1 : 1.15;
  const particles = [];
  let width = 1;
  let height = 1;
  let active = false;
  let frame = 0;
  let lastTime = 0;
  let inactiveSince = 0;

  const random = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

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

  const makeParticle = (initial = false) => {
    const life = random(9.5, 16.5);
    return {
      x: initial ? random(-width * .04, width * .55) : random(-38, -7),
      y: initial ? random(height * .28, height * .96) : random(height * .7, height * .98),
      vx: random(42, 78),
      vy: random(-20, -9),
      radius: random(.55, 1.65),
      alpha: random(.16, .44),
      phase: random(0, Math.PI * 2),
      wave: random(.55, 1.35),
      life,
      age: initial ? random(0, life * .72) : 0
    };
  };

  const fillParticles = () => {
    while (particles.length < maxParticles) particles.push(makeParticle(true));
  };

  // Lightweight rhythm proxy: no AudioContext/Analyser allocation. This avoids an
  // extra audio graph and saves memory on iOS/Android while still reacting subtly.
  const getMusicEnergy = () => {
    if (!music || music.paused) return 0;
    const time = music.currentTime || 0;
    return .038 + (Math.sin(time * 2.2) + 1) * .013 + (Math.sin(time * .73) + 1) * .006;
  };

  const render = (time) => {
    frame = 0;
    const delta = Math.min(.034, Math.max(.001, (time - (lastTime || time)) / 1000));
    lastTime = time;
    context.clearRect(0, 0, width, height);

    if (active && particles.length < maxParticles && Math.random() < .18) {
      particles.push(makeParticle(false));
    }

    const energy = getMusicEnergy();
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += delta;
      particle.phase += delta * particle.wave;
      particle.x += (particle.vx + Math.sin(particle.phase * 1.7) * 5.2) * delta;
      particle.y += (particle.vy + Math.cos(particle.phase * 1.23) * 2.4) * delta;

      if (particle.age >= particle.life || particle.x > width + 42 || particle.y < -42) {
        particles.splice(index, 1);
        if (active) particles.push(makeParticle(false));
        continue;
      }

      const progress = particle.age / particle.life;
      const alpha = particle.alpha
        * Math.min(1, progress / .12)
        * Math.min(1, (1 - progress) / .24)
        * Math.min(1, Math.max(0, (width - particle.x) / Math.max(60, width * .12)))
        * (.82 + Math.sin(particle.phase * 3.2) * .11 + energy * .38);
      if (alpha <= .004) continue;

      const radius = particle.radius * (1 + energy * .28 + Math.sin(particle.phase * 2.6) * .04);
      const x = particle.x + Math.sin(particle.phase * 4.1) * energy;
      const y = particle.y + Math.cos(particle.phase * 3.6) * energy * .7;
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 4.4);
      gradient.addColorStop(0, `rgba(255, 247, 224, ${Math.min(.68, alpha * 1.42)})`);
      gradient.addColorStop(.24, `rgba(222, 181, 111, ${alpha})`);
      gradient.addColorStop(1, "rgba(151, 105, 57, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius * 4.4, 0, Math.PI * 2);
      context.fill();
    }

    if (active || performance.now() - inactiveSince < 850) {
      frame = window.requestAnimationFrame(render);
    } else {
      context.clearRect(0, 0, width, height);
      particles.length = 0;
      lastTime = 0;
      // Collapse the backing store when inactive so mobile browsers can release it.
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
      inactiveSince = performance.now();
      if (!frame) frame = window.requestAnimationFrame(render);
    }
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => setActive(entry.isIntersecting && entry.intersectionRatio >= .06));
  }, { threshold: [.06, .14], rootMargin: "8% 0px 8% 0px" });
  observer.observe(section);

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

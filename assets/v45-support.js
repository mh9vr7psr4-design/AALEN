"use strict";
(() => {
  // source-site/assets/plan-fireflies.js
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
    const currentLimit = () => baseParticles + (focusCard || performance.now() < touchBoostUntil ? hoverExtra : 0);
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
        x: Math.max(0, Math.min(width, cardRect.left - canvasRect.left + cardRect.width * 0.5)),
        // Spawn near the lower edge so boosted particles visibly rise through the selected plan.
        y: Math.max(0, Math.min(height + 24, localBottom - cardRect.height * 0.08)),
        top: Math.max(0, Math.min(height, localTop)),
        spreadX: Math.min(cardRect.width * 0.46, width * 0.24),
        spreadY: Math.min(cardRect.height * 0.14, height * 0.06)
      };
    };
    const makeAmbientParticle = (initial = false) => {
      const life = random(7.2, 12.8);
      return {
        kind: "ambient",
        // Initial fill occupies the full visible column; all replacements are born at the bottom.
        x: random(width * 0.03, width * 0.97),
        y: initial ? random(height * 0.04, height * 1.02) : random(height * 0.92, height * 1.07),
        vx: random(-5.5, 5.5),
        vy: random(-66, -34),
        radius: random(0.78, 2.25),
        alpha: random(0.28, 0.62),
        phase: random(0, Math.PI * 2),
        wave: random(0.62, 1.5),
        life,
        age: initial ? random(0, life * 0.82) : 0
      };
    };
    const makeFocusParticle = (card, immediate = false) => {
      const point = getCardPoint(card) || { x: width * 0.5, y: height * 0.82, spreadX: width * 0.16, spreadY: 36 };
      const life = random(3.8, 7.2);
      return {
        kind: "focus",
        x: point.x + random(-point.spreadX, point.spreadX),
        y: point.y + random(-point.spreadY, point.spreadY * 0.7),
        vx: random(-8, 8),
        vy: random(-104, -54),
        radius: random(1.05, 2.9),
        alpha: random(0.42, 0.8),
        phase: random(0, Math.PI * 2),
        wave: random(0.9, 1.9),
        life,
        age: immediate ? random(0, life * 0.14) : 0
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
      return 0.045 + (Math.sin(time * 2.2) + 1) * 0.016 + (Math.sin(time * 0.73) + 1) * 8e-3;
    };
    const render = (time) => {
      frame = 0;
      const delta = Math.min(0.034, Math.max(1e-3, (time - (lastTime || time)) / 1e3));
      lastTime = time;
      context.clearRect(0, 0, width, height);
      const limit = currentLimit();
      const isBoosted = limit > baseParticles;
      if (active && particles.length < limit) {
        const chance = isBoosted ? 0.82 : 0.52;
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
        const fadeIn = Math.min(1, progress / (focus ? 0.07 : 0.1));
        const fadeOut = Math.min(1, (1 - progress) / (focus ? 0.18 : 0.2));
        const alpha = particle.alpha * fadeIn * fadeOut * (0.88 + Math.sin(particle.phase * 3.1) * 0.1 + energy * 0.42);
        if (alpha <= 4e-3) continue;
        const radius = particle.radius * (1 + energy * 0.32 + Math.sin(particle.phase * 2.6) * 0.06);
        const x = particle.x + Math.sin(particle.phase * 3.8) * (focus ? 1 : 0.5);
        const y = particle.y;
        const glowScale = focus ? 5.7 : 5.05;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius * glowScale);
        gradient.addColorStop(0, `rgba(255, 251, 226, ${Math.min(0.92, alpha * 1.62)})`);
        gradient.addColorStop(0.18, `rgba(244, 210, 132, ${Math.min(0.8, alpha * 1.2)})`);
        gradient.addColorStop(0.52, `rgba(198, 143, 59, ${alpha * 0.56})`);
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
      entries.forEach((entry) => setActive(entry.isIntersecting && entry.intersectionRatio >= 0.035));
    }, { threshold: [0.035, 0.1], rootMargin: "14% 0px 14% 0px" });
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
          burstAt(card, Math.max(6, Math.round(burstCount * 0.86)));
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

  // source-site/assets/warm-editorial-v10.js
  (() => {
    "use strict";
    const root = document.documentElement;
    const storageKey = "len-portfolio-works-copy-v10";
    const works = document.getElementById("works");
    const titleLabel = document.getElementById("works-exhibit-title");
    const noteLabel = document.getElementById("works-exhibit-note");
    const music = document.getElementById("background-music");
    const musicToggle = document.getElementById("music-toggle");
    const musicLabel = document.getElementById("music-label");
    const cards = Array.from(works?.querySelectorAll(".work-card[data-work-id]") || []);
    const readStore = () => {
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) || "{}");
        return value && typeof value === "object" ? value : {};
      } catch {
        return {};
      }
    };
    const writeStore = (value) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
      }
    };
    const normalise = (value) => String(value || "").replace(/\u00a0/g, " ").trim();
    const syncHud = (card) => {
      if (!card?.hasAttribute("data-exhibit-active")) return;
      if (titleLabel) titleLabel.textContent = card.dataset.exhibitTitle || "";
      if (noteLabel) noteLabel.textContent = card.dataset.exhibitNote || "";
    };
    const saveCard = (card) => {
      const id = card.dataset.workId;
      if (!id) return;
      const titleNode = card.querySelector("figcaption h3[data-edit]");
      const categoryNode = card.querySelector("figcaption p:not(.work-card__editor-note)[data-edit]");
      const noteNode = card.querySelector(".work-card__editor-note[data-edit]");
      const title = normalise(titleNode?.textContent);
      const category = normalise(categoryNode?.textContent);
      const note = normalise(noteNode?.textContent);
      card.dataset.exhibitTitle = title;
      card.dataset.exhibitNote = note;
      const store = readStore();
      store[id] = { title, category, note };
      writeStore(store);
      syncHud(card);
    };
    const saved = readStore();
    const generalNodes = Array.from(works?.querySelectorAll("[data-edit]") || []).filter((node) => !node.closest(".work-card[data-work-id]"));
    generalNodes.forEach((node, index) => {
      const key = `general-${index + 1}`;
      node.dataset.localEditKey = key;
      const storedText = saved.__general?.[key];
      if (typeof storedText === "string") node.textContent = storedText;
      let saveTimer = 0;
      const save = () => {
        const store = readStore();
        store.__general = store.__general && typeof store.__general === "object" ? store.__general : {};
        store.__general[key] = normalise(node.textContent);
        writeStore(store);
      };
      node.addEventListener("input", () => {
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(save, 160);
      });
      node.addEventListener("blur", () => {
        window.clearTimeout(saveTimer);
        save();
      });
    });
    cards.forEach((card) => {
      const id = card.dataset.workId;
      const record = saved[id];
      const titleNode = card.querySelector("figcaption h3[data-edit]");
      const categoryNode = card.querySelector("figcaption p:not(.work-card__editor-note)[data-edit]");
      const noteNode = card.querySelector(".work-card__editor-note[data-edit]");
      if (record && typeof record === "object") {
        if (typeof record.title === "string" && titleNode) titleNode.textContent = record.title;
        if (typeof record.category === "string" && categoryNode) categoryNode.textContent = record.category;
        if (typeof record.note === "string" && noteNode) noteNode.textContent = record.note;
      }
      card.dataset.exhibitTitle = normalise(titleNode?.textContent) || card.dataset.exhibitTitle || "";
      card.dataset.exhibitNote = normalise(noteNode?.textContent) || card.dataset.exhibitNote || "";
      let saveTimer = 0;
      [titleNode, categoryNode, noteNode].filter(Boolean).forEach((node) => {
        node.addEventListener("input", () => {
          window.clearTimeout(saveTimer);
          saveTimer = window.setTimeout(() => saveCard(card), 160);
        });
        node.addEventListener("blur", () => {
          window.clearTimeout(saveTimer);
          saveCard(card);
        });
      });
    });
    const activeCard = cards.find((card) => card.hasAttribute("data-exhibit-active"));
    if (activeCard) syncHud(activeCard);
    const activeObserver = new MutationObserver((mutations) => {
      const mutation = mutations.find((item) => item.attributeName === "data-exhibit-active");
      if (mutation) syncHud(mutation.target);
    });
    cards.forEach((card) => activeObserver.observe(card, { attributes: true, attributeFilter: ["data-exhibit-active"] }));
    const portrait = document.querySelector("[data-portrait-card]");
    const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (portrait && precisePointer.matches && !reducedMotion) {
      const source = portrait.querySelector("img[data-about-photo]");
      if (source && !portrait.querySelector(".about__portrait-mono")) {
        const monochrome = source.cloneNode(true);
        monochrome.removeAttribute("data-about-photo");
        monochrome.removeAttribute("loading");
        monochrome.className = "about__portrait-mono";
        monochrome.alt = "";
        monochrome.setAttribute("aria-hidden", "true");
        portrait.appendChild(monochrome);
      }
      let portraitFrame = 0;
      portrait.addEventListener("pointerenter", () => portrait.classList.add("is-portrait-active"));
      portrait.addEventListener("pointermove", (event) => {
        window.cancelAnimationFrame(portraitFrame);
        portraitFrame = window.requestAnimationFrame(() => {
          const bounds = portrait.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
          const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / Math.max(1, bounds.height)));
          portrait.style.setProperty("--portrait-x", `${(x * 100).toFixed(2)}%`);
          portrait.style.setProperty("--portrait-y", `${(y * 100).toFixed(2)}%`);
          portrait.style.setProperty("--portrait-tilt-y", `${((x - 0.5) * 2.2).toFixed(2)}deg`);
          portrait.style.setProperty("--portrait-tilt-x", `${((0.5 - y) * 1.7).toFixed(2)}deg`);
        });
      }, { passive: true });
      portrait.addEventListener("pointerleave", () => {
        window.cancelAnimationFrame(portraitFrame);
        portrait.classList.remove("is-portrait-active");
        portrait.style.setProperty("--portrait-x", "50%");
        portrait.style.setProperty("--portrait-y", "50%");
        portrait.style.setProperty("--portrait-tilt-x", "0deg");
        portrait.style.setProperty("--portrait-tilt-y", "0deg");
      });
    }
    const renderAudioState = () => {
      if (!music) return;
      const playing = !music.paused && !music.ended;
      root.dataset.audioState = playing ? "playing" : "paused";
      if (musicToggle) musicToggle.setAttribute("aria-pressed", String(playing));
    };
    if (music) {
      music.addEventListener("play", renderAudioState);
      music.addEventListener("pause", renderAudioState);
      music.addEventListener("ended", renderAudioState);
      music.addEventListener("error", () => {
        root.dataset.audioState = "error";
        if (musicLabel) musicLabel.textContent = "\u97F3\u4E50 \xB7 \u70B9\u51FB\u91CD\u8BD5";
      });
      renderAudioState();
    }
    document.querySelectorAll(".hero__copy h1 span, .manifesto__inner p span").forEach((node, index) => {
      node.setAttribute("data-ambient-float", "");
      node.style.setProperty("--ambient-delay", `${-(index * 1.15).toFixed(2)}s`);
    });
    window.addEventListener("pagehide", () => activeObserver.disconnect(), { once: true });
  })();

  // source-site/assets/v13-interactions.js
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
        const maxZ = touch ? 0.7 : 1.25;
        const shift = touch ? 1.8 : qualityLow ? 2.2 : 3.4;
        const nx = (x - 0.5) * 2;
        const ny = (y - 0.5) * 2;
        portrait.style.setProperty("--portrait-x", `${(x * 100).toFixed(2)}%`);
        portrait.style.setProperty("--portrait-y", `${(y * 100).toFixed(2)}%`);
        portrait.style.setProperty("--portrait-tilt-y", `${(nx * maxY).toFixed(2)}deg`);
        portrait.style.setProperty("--portrait-tilt-x", `${(-ny * maxX).toFixed(2)}deg`);
        portrait.style.setProperty("--portrait-tilt-z", `${(nx * -maxZ).toFixed(2)}deg`);
        portrait.style.setProperty("--portrait-shift-x", `${(nx * shift).toFixed(2)}px`);
        portrait.style.setProperty("--portrait-shift-y", `${(ny * shift * 0.62).toFixed(2)}px`);
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
      const fallback = card.dataset.exhibitTitle || `\u4F5C\u54C1 ${card.dataset.reservedGroup || ""}`.trim();
      const title = normalize(titleNode.textContent) || fallback;
      if (!normalize(titleNode.textContent)) titleNode.textContent = title;
      card.dataset.exhibitTitle = title;
      const media = card.querySelector("[data-image-slot]");
      const image = card.querySelector("[data-photo]");
      const count = Number(media?.dataset.galleryCount || 0);
      if (image && !image.hidden) image.alt = `${title} \u6444\u5F71\u4F5C\u54C1`;
      if (media && count > 0) {
        media.setAttribute(
          "aria-label",
          count > 1 ? `${title}\uFF0C\u70B9\u51FB\u8FDB\u5165${count}\u5F20\u7EC4\u56FE\u9875\u9762` : `${title}\uFF0C\u70B9\u51FB\u8FDB\u5165\u4F5C\u54C1\u9875\u9762`
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

  // source-site/assets/v14-refinements.js
  (() => {
    "use strict";
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const initEnvelope = () => {
      const overlay = document.getElementById("about-envelope-experience");
      const stage = overlay?.querySelector(".about-envelope-stage");
      const envelope = overlay?.querySelector(".len-envelope");
      const openButton = document.getElementById("about-envelope-open");
      if (!overlay || !stage || !envelope || !openButton) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let frame = 0;
      let tapTimer = 0;
      let touchResetTimer = 0;
      let target = { x: 0, y: 0, lx: 50, ly: 34 };
      let current = { x: 0, y: 0, lx: 50, ly: 34 };
      const paint = () => {
        frame = 0;
        const factor = reduced ? 1 : 0.18;
        current.x += (target.x - current.x) * factor;
        current.y += (target.y - current.y) * factor;
        current.lx += (target.lx - current.lx) * factor;
        current.ly += (target.ly - current.ly) * factor;
        overlay.style.setProperty("--env-tilt-x", `${current.x.toFixed(2)}deg`);
        overlay.style.setProperty("--env-tilt-y", `${current.y.toFixed(2)}deg`);
        overlay.style.setProperty("--env-light-x", `${current.lx.toFixed(2)}%`);
        overlay.style.setProperty("--env-light-y", `${current.ly.toFixed(2)}%`);
        if (Math.abs(target.x - current.x) > 0.03 || Math.abs(target.y - current.y) > 0.03 || Math.abs(target.lx - current.lx) > 0.08 || Math.abs(target.ly - current.ly) > 0.08) frame = requestAnimationFrame(paint);
      };
      const schedulePaint = () => {
        if (!frame) frame = requestAnimationFrame(paint);
      };
      const resetTilt = () => {
        target = { x: 0, y: 0, lx: 50, ly: 34 };
        schedulePaint();
      };
      const setFromPoint = (clientX, clientY, strength = 1) => {
        if (overlay.classList.contains("is-opening")) return;
        const rect = envelope.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = clamp((clientX - rect.left) / rect.width * 2 - 1, -1, 1);
        const ny = clamp((clientY - rect.top) / rect.height * 2 - 1, -1, 1);
        target.x = clamp(-ny * 7.8 * strength, -8.6, 8.6);
        target.y = clamp(nx * 9.1 * strength, -9.4, 9.4);
        target.lx = clamp(50 + nx * 28, 18, 82);
        target.ly = clamp(34 + ny * 20, 14, 72);
        schedulePaint();
      };
      stage.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        setFromPoint(event.clientX, event.clientY, 1);
      }, { passive: true });
      stage.addEventListener("pointerleave", resetTilt, { passive: true });
      envelope.addEventListener("pointerdown", (event) => {
        if (!overlay.classList.contains("is-awaiting-open") || overlay.classList.contains("is-opening")) return;
        event.stopPropagation();
        window.clearTimeout(tapTimer);
        window.clearTimeout(touchResetTimer);
        setFromPoint(event.clientX, event.clientY, event.pointerType === "touch" ? 0.72 : 1);
        overlay.classList.add("is-envelope-tapped");
        tapTimer = window.setTimeout(() => overlay.classList.remove("is-envelope-tapped"), 125);
        if (event.pointerType === "touch") {
          touchResetTimer = window.setTimeout(resetTilt, 460);
        }
      }, { passive: true });
      openButton.addEventListener("pointerdown", () => {
        overlay.classList.remove("is-envelope-tapped");
        resetTilt();
      }, { passive: true });
      window.addEventListener("pagehide", () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(tapTimer);
        window.clearTimeout(touchResetTimer);
      }, { once: true });
    };
    const initBookingTouch = () => {
      const steps = Array.from(document.querySelectorAll(".booking-step"));
      if (!steps.length) return;
      const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
      if (!coarse) return;
      let timer = 0;
      steps.forEach((step) => {
        step.addEventListener("pointerdown", () => {
          steps.forEach((item) => item !== step && item.classList.remove("is-v14-flipped"));
          step.classList.add("is-v14-flipped");
          window.clearTimeout(timer);
          timer = window.setTimeout(() => step.classList.remove("is-v14-flipped"), 980);
        }, { passive: true });
      });
    };
    const init = () => {
      initEnvelope();
      initBookingTouch();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  })();

  // source-site/assets/v19-plan-gold.js
  (() => {
    const section = document.getElementById("service-intro");
    if (!section) return;
    const cards = Array.from(section.querySelectorAll(
      ".service-plan, .service-extra, .service-rules, .makeup-showcase"
    ));
    if (!cards.length) return;
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const timers = /* @__PURE__ */ new WeakMap();
    const clearCard = (card) => {
      const timer = timers.get(card);
      if (timer) window.clearTimeout(timer);
      timers.delete(card);
      card.classList.remove("is-v19-gold");
    };
    const activate = (card, duration = 0) => {
      cards.forEach((item) => {
        if (item !== card) clearCard(item);
      });
      clearCard(card);
      card.classList.add("is-v19-gold");
      if (duration > 0) {
        const timer = window.setTimeout(() => clearCard(card), duration);
        timers.set(card, timer);
      }
    };
    if (coarse) {
      cards.forEach((card) => {
        card.addEventListener("pointerdown", () => activate(card, 1350), { passive: true });
        card.addEventListener("touchstart", () => activate(card, 1350), { passive: true });
      });
      section.addEventListener("pointerdown", (event) => {
        if (!event.target.closest(".service-plan, .service-extra, .service-rules, .makeup-showcase")) {
          cards.forEach(clearCard);
        }
      }, { passive: true });
    }
    window.addEventListener("pagehide", () => cards.forEach(clearCard), { once: true });
  })();

  // source-site/assets/v25-refinements.js
  (() => {
    "use strict";
    const links = Array.from(document.querySelectorAll("[data-section-link]"));
    if (!links.length) return;
    const selectId = (id) => {
      links.forEach((link) => {
        const active = link.dataset.sectionLink === id;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    };
    links.forEach((link) => {
      link.addEventListener("click", () => {
        selectId(link.dataset.sectionLink || "top");
      }, { passive: true });
    });
  })();

  // source-site/assets/v28-responsive.js
  (() => {
    "use strict";
    const root = document.documentElement;
    let raf = 0;
    const syncViewport = () => {
      raf = 0;
      const vv = window.visualViewport;
      const width = Math.max(1, Math.round(vv?.width || window.innerWidth || root.clientWidth || 1));
      const height = Math.max(1, Math.round(vv?.height || window.innerHeight || root.clientHeight || 1));
      root.style.setProperty("--v28-vh", `${height * 0.01}px`);
      root.style.setProperty("--v28-vw", `${width * 0.01}px`);
      root.classList.toggle("v28-phone", width <= 760);
      root.classList.toggle("v28-narrow", width <= 380);
      root.classList.toggle("v28-short", height <= 620);
      root.classList.toggle("v28-landscape-phone", width > height && height <= 620 && width <= 950);
    };
    const queueSync = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(syncViewport);
    };
    syncViewport();
    window.addEventListener("resize", queueSync, { passive: true });
    window.addEventListener("orientationchange", queueSync, { passive: true });
    window.visualViewport?.addEventListener("resize", queueSync, { passive: true });
    window.visualViewport?.addEventListener("scroll", queueSync, { passive: true });
    window.addEventListener("pageshow", queueSync, { passive: true });
  })();

  // source-site/assets/v45-mobile-brand.js
  (() => {
    "use strict";
    const root = document.documentElement;
    const mobileQuery = window.matchMedia("(max-width: 900px)");
    const isMobile = () => mobileQuery.matches;
    root.classList.toggle("v45-mobile", isMobile());
    const syncMobileClass = () => {
      root.classList.toggle("v45-mobile", isMobile());
    };
    mobileQuery.addEventListener?.("change", syncMobileClass);
    const syncBookingBar = () => {
      const visible = isMobile() && window.scrollY > window.innerHeight * 0.15;
      root.classList.toggle("v45-mobile-cta-visible", visible);
    };
    window.addEventListener("scroll", syncBookingBar, { passive: true });
    window.addEventListener("resize", syncBookingBar, { passive: true });
    syncBookingBar();
    if (isMobile()) {
      const heroCue = document.querySelector("#top .scroll-cue");
      const heroCueLabel = heroCue?.querySelector("span");
      if (heroCue) heroCue.setAttribute("href", "#works");
      if (heroCueLabel) heroCueLabel.textContent = "SWIPE INTO STORIES";
    }
    const initNativeWorks = () => {
      if (!isMobile()) return;
      const section = document.getElementById("works");
      const grid = section?.querySelector(".works-grid");
      if (!section || !grid) return;
      let allCards = [];
      let cards = [];
      const collectCards = () => {
        allCards = Array.from(grid.querySelectorAll(".work-card"));
        cards = allCards.filter((card) => {
          const image = card.querySelector("[data-photo]");
          return Boolean(image && !image.hidden && image.getAttribute("src"));
        });
      };
      collectCards();
      if (!cards.length) return;
      const indexLabel = document.getElementById("works-exhibit-index");
      const titleLabel = document.getElementById("works-exhibit-title");
      const noteLabel = document.getElementById("works-exhibit-note");
      const statusLabel = section.querySelector("[data-works-control-status]");
      const hintLabel = document.getElementById("works-scroll-hint");
      const indicatorTrack = document.getElementById("works-swipe-track");
      const indicatorBall = document.getElementById("works-depth-indicator-ball");
      const previous = document.getElementById("works-loop-prev");
      const next = document.getElementById("works-loop-next");
      const sticky = section.querySelector(".works-exhibit__sticky");
      let activeIndex = 0;
      let renderedIndex = -1;
      let frame = 0;
      const pad = (value) => String(value).padStart(2, "0");
      const nearestIndex = () => {
        const center = grid.scrollLeft + grid.clientWidth / 2;
        let nearest = 0;
        let distance = Number.POSITIVE_INFINITY;
        cards.forEach((card, index) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const nextDistance = Math.abs(cardCenter - center);
          if (nextDistance < distance) {
            nearest = index;
            distance = nextDistance;
          }
        });
        return nearest;
      };
      const paintParallax = () => {
        cards.forEach((card) => {
          card.style.removeProperty("--v45-swipe-drift");
        });
        sticky?.style.removeProperty("--v45-guide-shift");
      };
      const render = (nextIndex = nearestIndex()) => {
        if (!cards.length) return;
        const resolvedIndex = Math.max(0, Math.min(cards.length - 1, nextIndex));
        if (resolvedIndex === renderedIndex) return;
        activeIndex = resolvedIndex;
        renderedIndex = resolvedIndex;
        const card = cards[activeIndex];
        const title = card.dataset.exhibitTitle || card.querySelector("h3")?.textContent || "\u4F5C\u54C1\u7EC4\u56FE";
        const note = card.dataset.exhibitNote || "";
        const progress = cards.length > 1 ? activeIndex / (cards.length - 1) : 0;
        allCards.forEach((item) => {
          const active = item === card;
          item.toggleAttribute("data-exhibit-active", active);
          item.toggleAttribute("data-depth-current", active);
          item.removeAttribute("aria-hidden");
          item.style.setProperty("pointer-events", "auto", "important");
        });
        if (indexLabel) indexLabel.textContent = `${pad(activeIndex + 1)} / ${pad(cards.length)}`;
        if (statusLabel) statusLabel.textContent = `${pad(activeIndex + 1)} / ${pad(cards.length)}`;
        if (titleLabel) titleLabel.textContent = title;
        if (noteLabel) noteLabel.textContent = note;
        if (hintLabel) hintLabel.textContent = "\u5DE6\u53F3\u6ED1\u52A8 \xB7 \u70B9\u51FB\u8FDB\u5165\u5B8C\u6574\u7EC4\u56FE";
        if (indicatorTrack) indicatorTrack.style.setProperty("--indicator-progress", progress.toFixed(4));
        if (indicatorBall && indicatorTrack) {
          const travel = Math.max(0, indicatorTrack.clientWidth - 12);
          indicatorBall.style.setProperty("--indicator-x", `${(travel * progress).toFixed(2)}px`);
        }
        if (previous) previous.disabled = activeIndex === 0;
        if (next) next.disabled = activeIndex === cards.length - 1;
      };
      const scrollToCard = (index) => {
        const target = cards[Math.max(0, Math.min(cards.length - 1, index))];
        if (!target) return;
        const left = target.offsetLeft - (grid.clientWidth - target.offsetWidth) / 2;
        grid.scrollTo({ left, behavior: root.classList.contains("reduce-motion") ? "auto" : "smooth" });
      };
      grid.addEventListener("scroll", () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          paintParallax();
          render();
        });
      }, { passive: true });
      previous?.addEventListener("click", () => scrollToCard(activeIndex - 1));
      next?.addEventListener("click", () => scrollToCard(activeIndex + 1));
      window.addEventListener("len:works-changed", () => {
        collectCards();
        renderedIndex = -1;
        window.requestAnimationFrame(() => {
          paintParallax();
          render(Math.min(activeIndex, Math.max(0, cards.length - 1)));
        });
      });
      window.addEventListener("resize", () => {
        renderedIndex = -1;
        render();
      }, { passive: true });
      paintParallax();
      render(0);
    };
    initNativeWorks();
    const initPlans = () => {
      const section = document.getElementById("service-intro");
      if (!section) return;
      const choices = Array.from(section.querySelectorAll("[data-plan-choice]"));
      const plans = Array.from(section.querySelectorAll(".service-plan"));
      const details = Array.from(section.querySelectorAll(".plan-details-toggle"));
      section.dataset.activePlan = section.dataset.activePlan || "light";
      const selectPlan = (value) => {
        section.dataset.activePlan = value;
        choices.forEach((button) => {
          const selected = button.dataset.planChoice === value;
          button.setAttribute("aria-selected", String(selected));
          button.tabIndex = selected ? 0 : -1;
        });
        plans.forEach((plan) => plan.classList.remove("is-expanded"));
        details.forEach((button) => {
          button.setAttribute("aria-expanded", "false");
          button.firstChild.textContent = button.dataset.collapsedLabel || "\u67E5\u770B\u5305\u542B\u5185\u5BB9";
        });
      };
      choices.forEach((button) => button.addEventListener("click", () => selectPlan(button.dataset.planChoice)));
      details.forEach((button) => {
        button.addEventListener("click", () => {
          const plan = button.closest(".service-plan");
          if (!plan) return;
          const expanded = !plan.classList.contains("is-expanded");
          plan.classList.toggle("is-expanded", expanded);
          button.setAttribute("aria-expanded", String(expanded));
          button.firstChild.textContent = expanded
            ? button.dataset.expandedLabel || "\u6536\u8D77\u5305\u542B\u5185\u5BB9"
            : button.dataset.collapsedLabel || "\u67E5\u770B\u5305\u542B\u5185\u5BB9";
        });
      });
      selectPlan(section.dataset.activePlan);
    };
    initPlans();
    const initRules = () => {
      document.querySelectorAll(".service-rule-toggle").forEach((button) => {
        button.addEventListener("click", () => {
          if (!isMobile()) return;
          const expanded = button.getAttribute("aria-expanded") === "true";
          button.setAttribute("aria-expanded", String(!expanded));
        });
      });
    };
    initRules();
    const feedback = document.createElement("div");
    feedback.className = "v45-copy-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    document.body.append(feedback);
    let feedbackTimer = 0;
    const showFeedback = (message) => {
      window.clearTimeout(feedbackTimer);
      feedback.textContent = message;
      feedback.classList.add("is-visible");
      feedbackTimer = window.setTimeout(() => feedback.classList.remove("is-visible"), 1800);
    };
    const copyText = async (value, successMessage) => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const input = document.createElement("textarea");
        input.value = value;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      showFeedback(successMessage);
    };
    document.querySelectorAll("[data-copy-value]").forEach((button) => {
      button.addEventListener("click", () => copyText(
        button.dataset.copyValue || "",
        button.dataset.copySuccess || "\u5DF2\u590D\u5236"
      ));
    });
    window.addEventListener("pagehide", () => {
      window.clearTimeout(feedbackTimer);
      mobileQuery.removeEventListener?.("change", syncMobileClass);
    }, { once: true });
  })();
})();

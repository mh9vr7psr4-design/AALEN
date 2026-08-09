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
      // Private browsing or file permissions may disable storage; live editing still works.
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
  const generalNodes = Array.from(works?.querySelectorAll("[data-edit]") || [])
    .filter((node) => !node.closest(".work-card[data-work-id]"));

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
        portrait.style.setProperty("--portrait-tilt-y", `${((x - .5) * 2.2).toFixed(2)}deg`);
        portrait.style.setProperty("--portrait-tilt-x", `${((.5 - y) * 1.7).toFixed(2)}deg`);
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
      if (musicLabel) musicLabel.textContent = "音乐 · 点击重试";
    });
    renderAudioState();
  }

  document.querySelectorAll(".hero__copy h1 span, .manifesto__inner p span").forEach((node, index) => {
    node.setAttribute("data-ambient-float", "");
    node.style.setProperty("--ambient-delay", `${-(index * 1.15).toFixed(2)}s`);
  });

  window.addEventListener("pagehide", () => activeObserver.disconnect(), { once: true });
})();

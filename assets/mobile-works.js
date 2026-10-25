/* Mobile works: one controller; scrolling, inertia and snapping belong to the browser. */
(() => {
  "use strict";
  const root = document.documentElement;
  const mobile = window.matchMedia("(max-width: 900px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  const begin = () => {
    if (!mobile.matches) return;
    const section = document.getElementById("works");
    const grid = section?.querySelector(".works-grid");
    if (!grid || grid.dataset.mobileController === "native") return;
    grid.dataset.mobileController = "native";
    const previous = document.getElementById("works-loop-prev");
    const next = document.getElementById("works-loop-next");
    const title = document.getElementById("works-exhibit-title");
    const counter = document.getElementById("works-exhibit-index");
    const note = document.getElementById("works-exhibit-note");
    const toggle = section.querySelector(".works-description-toggle");
    const status = section.querySelector("[data-works-control-status]");
    const controls = section.querySelector(".works-loop-controls");
    const hint = document.getElementById("works-scroll-hint");
    const pad = value => String(value).padStart(2, "0");
    const clamp = (value, max) => Math.max(0, Math.min(max, value));
    let cards = [];
    let centers = [];
    let destinations = [];
    let width = 0;
    let current = -1;
    let activeCard = null;
    let requested = null;
    let frame = 0;
    let layoutFrame = 0;
    let resizeTimer = 0;
    let expanded = null;
    let editing = root.classList.contains("editing");
    let touchStart = null;
    let suppressClickUntil = 0;

    root.classList.add("v55-mobile-stable", "v56-mobile-works", "v57-ios-motion");
    section.classList.add("v56-description-ready");
    status?.setAttribute("aria-live", "polite");
    status?.setAttribute("aria-atomic", "true");
    const about = document.getElementById("about");
    about?.classList.add("about-story-complete", "is-about-letter-open");
    about?.classList.remove("is-about-story-awaiting", "is-about-letter-unfolding", "is-about-origin-rising");

    const setExpanded = value => {
      const open = Boolean(value || editing);
      if (open === expanded) return;
      expanded = open;
      if (open && note) note.style.setProperty("--v56-note-height", `${note.scrollHeight + 4}px`);
      section.classList.toggle("v56-description-open", open);
      toggle?.setAttribute("aria-expanded", String(open));
      note?.setAttribute("aria-hidden", String(!open));
      const label = toggle?.querySelector("span");
      if (label) label.textContent = open ? "收起作品介绍" : "展开作品介绍";
    };

    const nearest = () => {
      if (!centers.length) return -1;
      const center = grid.scrollLeft + width / 2;
      let index = 0;
      for (let i = 1; i < centers.length; i += 1) {
        if (Math.abs(centers[i] - center) < Math.abs(centers[index] - center)) index = i;
      }
      return index;
    };

    const render = () => {
      frame = 0;
      const index = nearest();
      if (index < 0 || index === current && activeCard === cards[index]) return;
      current = index;
      const card = cards[index];
      activeCard?.removeAttribute("data-mobile-work-current");
      activeCard = card;
      card.setAttribute("data-mobile-work-current", "true");
      const label = `${pad(index + 1)} / ${pad(cards.length)}`;
      if (counter) counter.textContent = label;
      if (status) status.textContent = label;
      if (title) title.textContent = card.dataset.exhibitTitle || card.querySelector("h3")?.textContent || "";
      if (note) note.textContent = card.dataset.exhibitNote || "";
      setExpanded(false);
      if (expanded && note) note.style.setProperty("--v56-note-height", `${note.scrollHeight + 4}px`);
      for (const [button, disabled] of [[previous, index === 0], [next, index === cards.length - 1]]) {
        if (!button) continue;
        button.disabled = disabled;
        button.setAttribute("aria-disabled", String(disabled));
      }
      controls?.style.setProperty("--v57-progress", `${cards.length <= 1 ? 100 : index * 100 / (cards.length - 1)}%`);
    };

    const queueRender = () => {
      if (!frame && !document.hidden) frame = window.requestAnimationFrame(render);
    };

    const collect = () => {
      cards = Array.from(grid.querySelectorAll(".work-card")).filter(card => {
        const image = card.querySelector("img[data-photo]");
        const valid = Boolean(image && !image.hidden && image.getAttribute("src"));
        if (valid) {
          card.removeAttribute("aria-hidden");
          for (const name of ["data-depth-state", "data-depth-current", "data-exhibit-active", "data-spatial-stage"]) card.removeAttribute(name);
        }
        return valid;
      });
    };

    // Layout is read only here, never in the scroll handler.
    const measure = () => {
      width = grid.clientWidth;
      const maximum = Math.max(0, grid.scrollWidth - width);
      centers = cards.map(card => card.offsetLeft + card.offsetWidth / 2);
      destinations = centers.map(center => clamp(center - width / 2, maximum));
    };

    const refresh = (keepPosition = true) => {
      window.cancelAnimationFrame(layoutFrame);
      layoutFrame = window.requestAnimationFrame(() => {
        layoutFrame = 0;
        const remembered = keepPosition ? activeCard : null;
        collect();
        measure();
        const retained = remembered ? cards.indexOf(remembered) : -1;
        const index = retained >= 0 ? retained : clamp(Math.max(0, current), cards.length - 1);
        requested = null;
        current = -1;
        grid.scrollLeft = destinations[index] || 0;
        render();
      });
    };

    const move = direction => {
      if (!cards.length) return;
      const index = clamp((requested ?? nearest()) + direction, cards.length - 1);
      requested = index;
      grid.scrollTo({ left: destinations[index], behavior: reduced.matches ? "auto" : "smooth" });
    };
    previous?.addEventListener("click", () => move(-1));
    next?.addEventListener("click", () => move(1));
    toggle?.addEventListener("click", () => setExpanded(!expanded));
    grid.addEventListener("scroll", queueRender, { passive: true });
    grid.addEventListener("scrollend", () => { requested = null; queueRender(); }, { passive: true });
    grid.addEventListener("keydown", event => {
      if (editing || event.target.isContentEditable) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    });
    grid.addEventListener("touchstart", event => {
      requested = null;
      const touch = event.touches[0];
      touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }, { passive: true });
    grid.addEventListener("touchmove", event => {
      const touch = event.touches[0];
      if (!touch || !touchStart) return;
      const dx = Math.abs(touch.clientX - touchStart.x);
      const dy = Math.abs(touch.clientY - touchStart.y);
      if (dx > 9 && dx > dy) suppressClickUntil = performance.now() + 300;
    }, { passive: true });
    grid.addEventListener("touchend", () => { touchStart = null; }, { passive: true });
    grid.addEventListener("touchcancel", () => { touchStart = null; }, { passive: true });
    grid.addEventListener("click", event => {
      if (editing || performance.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    // Editing and works changes are independent of unrelated page class changes.
    new MutationObserver(() => {
      const nextEditing = root.classList.contains("editing");
      if (nextEditing === editing) return;
      editing = nextEditing;
      setExpanded(editing);
      refresh();
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("len:works-changed", () => refresh());
    const resize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => refresh(), 120);
    };
    window.addEventListener("resize", resize, { passive: true });
    if ("ResizeObserver" in window) {
      new ResizeObserver(entries => {
        if (entries[0]?.contentRect.width !== width) resize();
      }).observe(grid);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else queueRender();
    }, { passive: true });
    window.addEventListener("pageshow", event => { if (event.persisted) refresh(); }, { passive: true });
    window.addEventListener("pagehide", () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(layoutFrame);
      window.clearTimeout(resizeTimer);
      frame = 0;
      layoutFrame = 0;
    });
    if (hint) hint.textContent = "左右滑动 · 点击进入完整组图";
    setExpanded(false);
    refresh(false);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", begin, { once: true });
  else begin();
})();

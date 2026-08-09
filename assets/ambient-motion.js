(() => {
  "use strict";

  const init = () => {
    const root = document.documentElement;
    const experience = window.LENExperience || { quality: root.dataset.quality || "medium" };
    const sections = Array.from(document.querySelectorAll("#top, #about, #works, #booking, #service-intro, #services, #contact, .manifesto"));

    sections.forEach((section, index) => {
      section.classList.add("len-ambient-section", `len-ambient-section--${index + 1}`);
      if (!section.querySelector(":scope > .len-ambient-layer")) {
        const layer = document.createElement("i");
        layer.className = "len-ambient-layer";
        layer.setAttribute("aria-hidden", "true");
        section.prepend(layer);
      }
    });

    const hero = document.getElementById("top");
    const addMotes = () => {
      if (!hero || hero.querySelector(".len-motes") || experience.quality === "low") return;
      const field = document.createElement("div");
      field.className = "len-motes";
      field.setAttribute("aria-hidden", "true");
      const amount = experience.quality === "high" ? 12 : 6;
      for (let index = 0; index < amount; index += 1) {
        const mote = document.createElement("i");
        mote.style.setProperty("--mote-x", `${8 + ((index * 19) % 86)}%`);
        mote.style.setProperty("--mote-y", `${12 + ((index * 31) % 76)}%`);
        mote.style.setProperty("--mote-delay", `${-index * 1.7}s`);
        mote.style.setProperty("--mote-duration", `${16 + (index % 5) * 4}s`);
        field.appendChild(mote);
      }
      hero.appendChild(field);
    };

    addMotes();
    window.addEventListener("len:qualitychange", (event) => {
      if (event.detail?.quality === "low") hero?.querySelector(".len-motes")?.remove();
      else addMotes();
    });

    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => section.classList.add("len-ambient-active"));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.target.classList.toggle("len-ambient-active", entry.isIntersecting));
      }, { threshold: .025, rootMargin: "12% 0px 12% 0px" });
      sections.forEach((section) => observer.observe(section));
    }

    root.classList.add("len-ambient-ready");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

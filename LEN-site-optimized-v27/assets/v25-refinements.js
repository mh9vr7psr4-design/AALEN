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

(() => {
  const section = document.getElementById('service-intro');
  if (!section) return;

  const cards = Array.from(section.querySelectorAll(
    '.service-plan, .service-extra, .service-rules, .makeup-showcase'
  ));
  if (!cards.length) return;

  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const timers = new WeakMap();

  const clearCard = (card) => {
    const timer = timers.get(card);
    if (timer) window.clearTimeout(timer);
    timers.delete(card);
    card.classList.remove('is-v19-gold');
  };

  const activate = (card, duration = 0) => {
    cards.forEach((item) => {
      if (item !== card) clearCard(item);
    });
    clearCard(card);
    card.classList.add('is-v19-gold');
    if (duration > 0) {
      const timer = window.setTimeout(() => clearCard(card), duration);
      timers.set(card, timer);
    }
  };

  if (coarse) {
    cards.forEach((card) => {
      card.addEventListener('pointerdown', () => activate(card, 1350), { passive: true });
      card.addEventListener('touchstart', () => activate(card, 1350), { passive: true });
    });
    section.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.service-plan, .service-extra, .service-rules, .makeup-showcase')) {
        cards.forEach(clearCard);
      }
    }, { passive: true });
  }

  window.addEventListener('pagehide', () => cards.forEach(clearCard), { once: true });
})();

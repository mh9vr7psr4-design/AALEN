(() => {
  "use strict";

  const init = () => {
    const root = document.documentElement;
    const about = document.getElementById("about");
    const overlay = document.getElementById("about-envelope-experience");
    const openButton = document.getElementById("about-envelope-open");
    if (!about || !overlay || !openButton) return;

    const experience = window.LENExperience || {
      quality: root.dataset.quality || "medium",
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      aboutPlayed: false
    };
    window.LENExperience = experience;

    const sessionKey = "len-about-blue-paper-story-v9";
    let playedThisVisit = experience.aboutPlayed;
    try {
      playedThisVisit = playedThisVisit || sessionStorage.getItem(sessionKey) === "complete";
    } catch {
      playedThisVisit = Boolean(experience.aboutPlayed);
    }

    let storyActive = false;
    let awaitingIntro = false;
    let quickRevealReady = playedThisVisit;
    let lastFocused = null;
    const timers = new Set();
    let scrollFrame = 0;

    const later = (callback, delay) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
      return timer;
    };

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = 0;
    };

    const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
    const easeInOutCubic = (value) => value < .5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;

    const scrollToAbout = () => {
      const target = window.scrollY + about.getBoundingClientRect().top;
      if (experience.reducedMotion) {
        window.scrollTo(0, target);
        return;
      }

      window.cancelAnimationFrame(scrollFrame);
      const from = window.scrollY;
      const startedAt = performance.now();
      const duration = experience.quality === "low" ? 620 : 820;
      const step = (time) => {
        const progress = clamp((time - startedAt) / duration);
        window.scrollTo(0, from + (target - from) * easeInOutCubic(progress));
        if (progress < 1) {
          scrollFrame = window.requestAnimationFrame(step);
        } else {
          scrollFrame = 0;
        }
      };
      scrollFrame = window.requestAnimationFrame(step);
    };

    const introIsFinished = () => !root.classList.contains("intro-lock");

    const runQuickReveal = () => {
      if (storyActive || !quickRevealReady) return;
      about.classList.add("is-about-letter-open", "about-story-complete");
      about.classList.remove("is-about-up-reveal");
      void about.offsetWidth;
      about.classList.add("is-about-up-reveal");
      later(() => about.classList.remove("is-about-up-reveal"), experience.reducedMotion ? 360 : 1180);
    };

    const rememberStory = () => {
      playedThisVisit = true;
      quickRevealReady = true;
      experience.aboutPlayed = true;
      try {
        sessionStorage.setItem(sessionKey, "complete");
      } catch {
        // Storage can be unavailable in private file contexts; the in-memory flag still protects this visit.
      }

    };

    const hideEnvelopeLayer = () => {
      overlay.className = "about-envelope-experience";
      overlay.setAttribute("aria-hidden", "true");
      overlay.hidden = true;
    };

    const finishLetterHandoff = () => {
      storyActive = false;
      about.classList.remove("is-about-letter-unfolding");
      about.classList.add("is-about-letter-open", "about-story-complete");
      root.classList.remove("about-story-lock", "about-story-active");

      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus({ preventScroll: true });
      }
    };

    const beginLetterHandoff = () => {
      rememberStory();
      about.classList.remove("is-about-story-awaiting", "is-about-up-reveal", "about-story-armed");
      about.classList.add("is-about-letter-unfolding");
      overlay.classList.add("is-completing");
      root.classList.remove("about-story-lock", "about-story-active");

      scrollToAbout();

      const overlayDuration = experience.reducedMotion ? 80 : experience.quality === "low" ? 620 : 760;
      const unfoldDuration = experience.reducedMotion ? 120 : experience.quality === "low" ? 1380 : 1840;
      later(hideEnvelopeLayer, overlayDuration);
      later(finishLetterHandoff, unfoldDuration);
    };

    const openEnvelope = () => {
      if (!storyActive || overlay.classList.contains("is-opening")) return;
      openButton.disabled = true;
      overlay.classList.remove("is-awaiting-open");
      overlay.classList.add("is-opening");

      const low = experience.quality === "low";
      const reduced = experience.reducedMotion;
      const closingDelay = reduced ? 70 : low ? 1180 : 1460;
      const handoffDelay = reduced ? 120 : low ? 1480 : 1760;

      later(() => {
        overlay.classList.add("is-closing-to-about");
      }, closingDelay);
      later(beginLetterHandoff, handoffDelay);
    };

    const beginStory = () => {
      if (storyActive || playedThisVisit) {
        runQuickReveal();
        return;
      }
      if (!introIsFinished()) {
        awaitingIntro = true;
        return;
      }

      storyActive = true;
      awaitingIntro = false;
      lastFocused = document.activeElement;
      clearTimers();
      about.classList.remove("is-about-letter-open", "is-about-letter-unfolding");
      about.classList.add("is-about-story-awaiting");
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
      openButton.disabled = true;
      root.classList.add("about-story-lock", "about-story-active");

      window.requestAnimationFrame(() => {
        overlay.classList.add("is-active");
        window.requestAnimationFrame(() => overlay.classList.add("is-approaching"));
      });

      const approachDelay = experience.reducedMotion ? 90 : experience.quality === "low" ? 480 : 620;
      later(() => {
        overlay.classList.add("is-awaiting-open");
        openButton.disabled = false;
        openButton.focus({ preventScroll: true });
      }, approachDelay);
    };

    openButton.addEventListener("click", openEnvelope);

    if (playedThisVisit) {
      experience.aboutPlayed = true;
      about.classList.add("about-story-complete", "is-about-letter-open");
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
    } else {
      about.classList.add("about-story-armed");
    }

    if (!("IntersectionObserver" in window)) {
      if (!playedThisVisit) beginStory();
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < .12) return;
          if (playedThisVisit) runQuickReveal();
          else beginStory();
        });
      }, { threshold: [.12, .24, .5], rootMargin: "-4% 0px -8% 0px" });
      observer.observe(about);
    }

    const introObserver = new MutationObserver(() => {
      if (awaitingIntro && introIsFinished()) beginStory();
    });
    introObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("pagehide", () => {
      clearTimers();
      introObserver.disconnect();
    }, { once: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

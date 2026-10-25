(() => {
      const intro = document.getElementById("intro");
      const progress = document.getElementById("intro-progress");
      const fill = document.getElementById("intro-progress-fill");
      const value = document.getElementById("intro-progress-value");
      const visitStamp = new Date().toISOString().slice(0, 10);
      let returningToday = false;
      try {
        returningToday = localStorage.getItem("len-v45-visit-day") === visitStamp;
        localStorage.setItem("len-v45-visit-day", visitStamp);
      } catch {
        returningToday = false;
      }
      document.documentElement.classList.toggle("len-returning-today", returningToday);
      const state = {
        value: 0,
        target: 0,
        frame: 0,
        failsafe: 0,
        stopped: false,
        startedAt: performance.now(),
        minimumDuration: 4400,
        returningToday
      };

      const render = () => {
        const rounded = Math.round(state.value);
        fill.style.transform = `scaleX(${rounded / 100})`;
        value.textContent = String(rounded);
        progress.setAttribute("aria-valuenow", String(rounded));
      };

      const paint = () => {
        if (state.stopped) return;
        const elapsed = performance.now() - state.startedAt;
        const timelineCap = Math.min(96, (elapsed / state.minimumDuration) * 96);
        const visibleTarget = Math.min(state.target, timelineCap);
        const distance = visibleTarget - state.value;
        state.value += Math.abs(distance) < .04 ? distance : distance * .18;
        render();
        state.frame = requestAnimationFrame(paint);
      };

      state.setTarget = (nextTarget) => {
        state.target = Math.max(state.target, Math.min(96, nextTarget));
      };

      state.stop = () => {
        state.stopped = true;
        cancelAnimationFrame(state.frame);
      };

      const markStageReady = () => {
        intro.classList.add("is-imaged");
        state.setTarget(82);
      };

      window.setTimeout(() => state.setTarget(18), returningToday ? 40 : 110);
      window.setTimeout(markStageReady, returningToday ? 160 : 360);

      document.addEventListener("DOMContentLoaded", () => state.setTarget(48), { once: true });
      window.addEventListener("load", () => state.setTarget(96), { once: true });
      state.failsafe = window.setTimeout(() => {
        if (intro.classList.contains("is-hidden")) return;
        state.stop();
        state.value = 100;
        render();
        window.setTimeout(() => {
          document.documentElement.classList.add("intro-reveal");
          intro.classList.add("is-leaving");
          window.setTimeout(() => {
            intro.classList.add("is-hidden");
            document.documentElement.classList.remove("intro-lock");
          }, returningToday ? 360 : 650);
        }, returningToday ? 40 : 100);
      }, 5500);
      window.__lenIntroBoot = state;
      render();
      state.frame = requestAnimationFrame(paint);
    })();

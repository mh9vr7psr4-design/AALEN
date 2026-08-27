(() => {
  "use strict";

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const memory = Number(navigator.deviceMemory || 8);
  const cores = Number(navigator.hardwareConcurrency || 8);
  const dpr = Math.max(1, Number(window.devicePixelRatio || 1));
  const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const isMobile = coarsePointer || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const supportsWebGL = (() => {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2", { powerPreference: "high-performance" }) || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  })();

  const benchmarkStart = performance.now();
  let benchmarkValue = 0;
  for (let index = 0; index < 16000; index += 1) {
    benchmarkValue += Math.sin(index * 0.013) * Math.cos(index * 0.007);
  }
  const benchmarkMs = performance.now() - benchmarkStart;

  let score = 0;
  score += cores >= 12 ? 4 : cores >= 8 ? 3 : cores >= 6 ? 2 : cores >= 4 ? 1 : -2;
  score += memory >= 12 ? 4 : memory >= 8 ? 3 : memory >= 6 ? 2 : memory >= 4 ? 0 : -3;
  score += supportsWebGL ? 2 : -4;
  score += benchmarkMs < 5 ? 2 : benchmarkMs < 11 ? 1 : benchmarkMs > 24 ? -2 : 0;
  score += connection?.saveData ? -5 : 0;
  score += /(^|-)2g$/.test(connection?.effectiveType || "") ? -3 : 0;
  score += dpr > 3 ? -2 : dpr > 2.25 ? -1 : 0;
  score += isMobile ? -1 : 1;
  score += Math.min(window.innerWidth, window.innerHeight) >= 900 ? 1 : 0;

  let quality = reducedMotion ? "low" : score >= 8 ? "high" : score >= 3 ? "medium" : "low";
  const qualityRank = { low: 0, medium: 1, high: 2 };
  const experience = window.LENExperience || {};

  const applyQuality = (nextQuality, reason = "hardware") => {
    if (!qualityRank.hasOwnProperty(nextQuality)) return;
    if (experience.quality && qualityRank[nextQuality] > qualityRank[experience.quality]) return;
    quality = nextQuality;
    experience.quality = quality;
    experience.qualityReason = reason;
    root.dataset.quality = quality;
    root.classList.remove("quality-high", "quality-medium", "quality-low");
    root.classList.add(`quality-${quality}`);
    window.dispatchEvent(new CustomEvent("len:qualitychange", { detail: { quality, reason } }));
  };

  Object.assign(experience, {
    quality,
    reducedMotion,
    aboutPlayed: Boolean(experience.aboutPlayed),
    pointer: experience.pointer || { x: 0, y: 0 },
    capabilities: {
      cores,
      memory,
      dpr,
      isMobile,
      supportsWebGL,
      saveData: Boolean(connection?.saveData),
      benchmarkMs: Number(benchmarkMs.toFixed(2)),
      benchmarkValue: Number(benchmarkValue.toFixed(2))
    },
    setQuality: applyQuality
  });
  window.LENExperience = experience;
  applyQuality(quality, reducedMotion ? "reduced-motion" : "hardware");

  let sampleStart = 0;
  let sampleFrames = 0;
  let sampleWindows = 0;
  let stopped = false;

  const sampleFps = (time) => {
    if (stopped || document.hidden) return;
    if (!sampleStart) sampleStart = time;
    sampleFrames += 1;
    const elapsed = time - sampleStart;

    if (elapsed >= 1350) {
      const fps = sampleFrames * 1000 / elapsed;
      experience.lastSampledFps = Number(fps.toFixed(1));
      sampleWindows += 1;

      if (fps < 29 && quality !== "low") {
        applyQuality("low", "fps-watchdog");
      } else if (fps < 42 && quality === "high") {
        applyQuality("medium", "fps-watchdog");
      }

      sampleStart = time;
      sampleFrames = 0;
      if (sampleWindows >= 3 || quality === "low") {
        stopped = true;
        return;
      }
    }
    window.requestAnimationFrame(sampleFps);
  };

  const beginSampling = () => {
    if (!stopped && !reducedMotion) window.requestAnimationFrame(sampleFps);
  };

  if (document.readyState === "complete") {
    window.setTimeout(beginSampling, 500);
  } else {
    window.addEventListener("load", () => window.setTimeout(beginSampling, 500), { once: true });
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden || stopped) return;
    stopped = true;
  }, { passive: true });
})();

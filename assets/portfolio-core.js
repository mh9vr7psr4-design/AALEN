(() => {
      "use strict";

      const root = document.documentElement;
      const intro = document.getElementById("intro");
      const skip = document.getElementById("intro-skip");
      const introProgress = document.getElementById("intro-progress");
      const introProgressFill = document.getElementById("intro-progress-fill");
      const introProgressValue = document.getElementById("intro-progress-value");
      const editToggle = document.getElementById("edit-toggle");
      const exportButton = document.getElementById("export-html");
      const fileInput = document.getElementById("owner-file-input");
      const hint = document.getElementById("owner-hint");
      const toast = document.getElementById("edit-toast");
      const lightbox = document.getElementById("lightbox");
      const lightboxImage = document.getElementById("lightbox-image");
      const lightboxCaption = document.getElementById("lightbox-caption");
      const lightboxCounter = document.getElementById("lightbox-counter");
      const lightboxClose = document.getElementById("lightbox-close");
      const lightboxPrev = document.getElementById("lightbox-prev");
      const lightboxNext = document.getElementById("lightbox-next");
      const musicToggle = document.getElementById("music-toggle");
      const musicLabel = document.getElementById("music-label");
      const backgroundMusic = document.getElementById("background-music");
      const backToTop = document.getElementById("back-to-top");
      const siteHeader = document.querySelector(".site-header");
      const scrollProgress = document.getElementById("scroll-progress");
      const menuToggle = document.getElementById("menu-toggle");
      const mobileNav = document.getElementById("mobile-nav");
      const mobileNavLinks = Array.from(mobileNav.querySelectorAll("a"));
      const hero = document.getElementById("top");
      const sectionStatus = document.getElementById("section-status");
      const navLinks = Array.from(document.querySelectorAll("[data-section-link]"));
      const galleryPage = document.getElementById("gallery-page");
      const galleryPageBack = document.getElementById("gallery-page-back");
      const galleryPageTitle = document.getElementById("gallery-page-title");
      const galleryPageCounter = document.getElementById("gallery-page-counter");
      const galleryPageTrack = document.getElementById("gallery-page-track");
      const galleryPageProgress = document.getElementById("gallery-page-progress");
      const galleryManager = document.getElementById("gallery-manager");
      const galleryManagerTitle = document.getElementById("gallery-manager-title");
      const galleryManagerMeta = document.getElementById("gallery-manager-meta");
      const galleryGroupNavigator = document.getElementById("gallery-group-nav");
      const galleryGroupPrevious = document.getElementById("gallery-group-prev");
      const galleryGroupNext = document.getElementById("gallery-group-next");
      const galleryGroupIndex = document.getElementById("gallery-group-index");
      const galleryReplaceCover = document.getElementById("gallery-replace-cover");
      const galleryAddImages = document.getElementById("gallery-add-images");
      const galleryGroupFields = document.getElementById("gallery-group-fields");
      const galleryGroupTitle = document.getElementById("gallery-group-title");
      const galleryGroupCategory = document.getElementById("gallery-group-category");
      const galleryGroupNote = document.getElementById("gallery-group-note");
      const gallerySaveCopy = document.getElementById("gallery-save-copy");
      const galleryImageList = document.getElementById("gallery-image-list");
      const gallerySelectionMeta = document.getElementById("gallery-selection-meta");
      const gallerySelectAll = document.getElementById("gallery-select-all");
      const galleryDeleteSelected = document.getElementById("gallery-delete-selected");
      const galleryDeleteGroup = document.getElementById("gallery-delete-group");
      const galleryManagerClose = document.getElementById("gallery-manager-close");
      const addWorkGroupButton = document.getElementById("work-add-group");
      const autosaveToggle = document.getElementById("autosave-toggle");
      const autosaveStatus = document.getElementById("autosave-status");
      const worksGrid = document.querySelector("#works .works-grid");
      let editableItems = Array.from(document.querySelectorAll("[data-edit]"));
      let imageSlots = Array.from(document.querySelectorAll("[data-image-slot]"));
      const isLocalFile = location.protocol === "file:";
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const canUsePointerEffects = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const isIOSWebKit = /iP(?:hone|ad|od)/.test(navigator.userAgent) || (
        navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
      );
      let editing = false;
      let activeImageSlot = null;
      let selectedGalleryIndexes = new Set();
      let fileAction = "add";
      let toastTimer = 0;
      let introFrame = 0;
      let introLeaving = false;
      let lightboxTimer = 0;
      let activeGallery = [];
      let activeGalleryIndex = 0;
      let activeGalleryLabel = "";
      let galleryPageTimer = 0;
      let galleryPageTrigger = null;
      let galleryPageScrollFrame = 0;
      let audioMuted = true;
      let audioUserPaused = true;
      let audioFadeFrame = 0;
      let audioPausedByVisibility = false;
      const audioTargetVolume = .48;
      const autosaveStorageKey = "len-v52-local-autosave-enabled";
      const autosaveIntervalMs = 5 * 60 * 1000;
      let autosaveEnabled = false;
      let autosaveDirty = false;
      let autosaveTimer = 0;

      const updateAutosaveStatus = () => {
        if (!autosaveToggle || !autosaveStatus) return;
        autosaveToggle.checked = autosaveEnabled;
        autosaveToggle.setAttribute("aria-checked", String(autosaveEnabled));
        autosaveStatus.textContent = autosaveEnabled
          ? autosaveDirty ? "待保存" : "已开启"
          : "关闭";
      };

      const markAutosaveDirty = () => {
        if (!isLocalFile) return;
        autosaveDirty = true;
        if (autosaveEnabled) updateAutosaveStatus();
      };

      const setAutosaveEnabled = (nextState, announce = false) => {
        autosaveEnabled = Boolean(nextState && isLocalFile);
        if (autosaveTimer) {
          window.clearInterval(autosaveTimer);
          autosaveTimer = 0;
        }
        if (autosaveEnabled) {
          autosaveTimer = window.setInterval(runAutosave, autosaveIntervalMs);
        }
        try {
          localStorage.setItem(autosaveStorageKey, autosaveEnabled ? "true" : "false");
        } catch {}
        updateAutosaveStatus();
        if (announce) {
          showToast(
            autosaveEnabled
              ? "自动保存已开启：有改动时每 5 分钟导出一份 HTML"
              : "自动保存已关闭"
          );
        }
      };

      const updateMusicControl = () => {
        const isRunning = Boolean(backgroundMusic && !backgroundMusic.paused && !backgroundMusic.ended);
        musicToggle.classList.toggle("is-playing", isRunning && !audioMuted);
        musicToggle.classList.toggle("is-pending", !isRunning && !audioUserPaused);
        musicToggle.setAttribute("aria-pressed", String(isRunning && !audioMuted));
        musicLabel.textContent = isRunning && !audioMuted ? "♫ SOUND ON" : "♫ SOUND";
      };

      const fadeAudioTo = (target, duration = 420, onComplete) => {
        if (!backgroundMusic) return;
        if (audioFadeFrame) cancelAnimationFrame(audioFadeFrame);
        const startedAt = performance.now();
        const from = backgroundMusic.volume;
        const safeTarget = clampAudioVolume(target);

        const stepVolume = (time) => {
          const progress = Math.min(1, (time - startedAt) / Math.max(duration, 1));
          const eased = 1 - Math.pow(1 - progress, 3);
          backgroundMusic.volume = clampAudioVolume(from + (safeTarget - from) * eased);
          if (progress < 1) {
            audioFadeFrame = requestAnimationFrame(stepVolume);
          } else {
            audioFadeFrame = 0;
            onComplete?.();
          }
        };

        audioFadeFrame = requestAnimationFrame(stepVolume);
      };

      const clampAudioVolume = (value) => Math.min(1, Math.max(0, value));

      const startAmbientAudio = async ({ force = false } = {}) => {
        if (!backgroundMusic || (audioUserPaused && !force)) return false;
        try {
          if (backgroundMusic.paused) {
            backgroundMusic.volume = 0;
            await backgroundMusic.play();
            fadeAudioTo(audioTargetVolume, force ? 720 : 1800);
          } else if (backgroundMusic.volume < audioTargetVolume * .82) {
            fadeAudioTo(audioTargetVolume, 520);
          }
          audioMuted = false;
          audioPausedByVisibility = false;
          updateMusicControl();
          return true;
        } catch (error) {
          updateMusicControl();
          return false;
        }
      };

      const setAudioMuted = (muted) => {
        if (!backgroundMusic) return;
        audioMuted = muted;
        if (muted) {
          fadeAudioTo(0, 260, () => {
            backgroundMusic.pause();
            updateMusicControl();
          });
        } else {
          startAmbientAudio({ force: true });
        }
        updateMusicControl();
      };

      musicToggle.addEventListener("click", async () => {
        if (!backgroundMusic) return;
        if (backgroundMusic.paused || audioMuted) {
          audioUserPaused = false;
          audioMuted = false;
          await startAmbientAudio({ force: true });
          return;
        }
        audioUserPaused = true;
        setAudioMuted(true);
      });

      backgroundMusic?.addEventListener("play", updateMusicControl);
      backgroundMusic?.addEventListener("pause", updateMusicControl);
      backgroundMusic?.addEventListener("waiting", () => {
        if (!audioUserPaused) musicLabel.textContent = "♫ SOUND LOADING";
      });
      backgroundMusic?.addEventListener("canplay", updateMusicControl);
      backgroundMusic?.addEventListener("error", () => {
        musicToggle.classList.remove("is-playing", "is-pending");
        musicLabel.textContent = "♫ SOUND RETRY";
      });

      document.addEventListener("visibilitychange", () => {
        if (!backgroundMusic) return;
        if (document.hidden && !backgroundMusic.paused) {
          audioPausedByVisibility = true;
          backgroundMusic.pause();
        } else if (!document.hidden && audioPausedByVisibility && !audioUserPaused) {
          startAmbientAudio({ force: true });
        }
      });

      root.classList.add("intro-lock");
      const introBoot = window.__lenIntroBoot;
      const introStartedAt = Number(introBoot?.startedAt) || performance.now();

      const setIntroProgress = (value) => {
        const safeValue = Math.max(0, Math.min(100, Math.round(value)));
        introProgressFill.style.transform = `scaleX(${safeValue / 100})`;
        introProgressValue.textContent = String(safeValue);
        introProgress.setAttribute("aria-valuenow", String(safeValue));
      };

      const revealSite = () => {
        if (introLeaving) return;
        introLeaving = true;
        window.cancelAnimationFrame(introFrame);
        if (introBoot?.stop) introBoot.stop();
        if (introBoot?.failsafe) window.clearTimeout(introBoot.failsafe);
        window.__lenIntroBoot = null;
        setIntroProgress(100);
        window.setTimeout(() => {
          root.classList.add("intro-reveal");
          intro.classList.add("is-leaving");
          window.setTimeout(() => {
            intro.classList.add("is-hidden");
            root.classList.remove("intro-lock");
          }, reduceMotion ? 30 : introBoot?.returningToday ? 360 : 650);
        }, reduceMotion ? 20 : introBoot?.returningToday ? 40 : 100);
      };

      const enterSite = () => {
        revealSite();
      };

      const waitForHero = () => {
        const heroImage = document.querySelector(".hero__media > img");
        if (!heroImage) return Promise.resolve();

        const loaded = heroImage.complete && heroImage.naturalWidth
          ? Promise.resolve()
          : new Promise((resolve) => {
              heroImage.addEventListener("load", resolve, { once: true });
              heroImage.addEventListener("error", resolve, { once: true });
            });

        return loaded.then(() => {
          intro.classList.add("is-imaged");
          introBoot?.setTarget?.(84);
          if (!heroImage.decode) return;
          return heroImage.decode().catch(() => {});
        });
      };

      const waitForWindowLoad = () => document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));

      const delay = (milliseconds) => new Promise((resolve) => {
        window.setTimeout(resolve, Math.max(0, milliseconds));
      });

      const finishIntro = async () => {
        const criticalReady = Promise.all([waitForHero(), waitForWindowLoad()]);
        const elapsed = performance.now() - introStartedAt;
        const holdDuration = reduceMotion ? 120 : 4400;
        const minimumHold = delay(holdDuration - elapsed);
        const guardedReady = Promise.race([criticalReady, delay(holdDuration)]);
        await Promise.all([minimumHold, guardedReady]);
        revealSite();
      };

      skip.addEventListener("click", enterSite);

      finishIntro();

      if (isLocalFile) {
        root.classList.add("local-mode");
      }

      const setMenuOpen = (open) => {
        root.classList.toggle("menu-open", open);
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
        mobileNav.setAttribute("aria-hidden", String(!open));
        mobileNav.inert = !open;
      };

      menuToggle.addEventListener("click", () => {
        setMenuOpen(!root.classList.contains("menu-open"));
      });

      mobileNavLinks.forEach((link) => {
        link.addEventListener("click", () => setMenuOpen(false));
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 900 && root.classList.contains("menu-open")) {
          setMenuOpen(false);
        }
      }, { passive: true });

      const sectionLabels = {
        top: "首页",
        works: "作品",
        about: "摄影师",
        "service-intro": "服务",
        booking: "流程",
        contact: "联系"
      };
      const trackedSections = Object.keys(sectionLabels)
        .map((id) => document.getElementById(id))
        .filter(Boolean);
      let scrollUiFrame = 0;

      const syncScrollUi = () => {
        const scrollPosition = window.scrollY;
        const scrollRange = Math.max(1, root.scrollHeight - window.innerHeight);
        const pageProgress = Math.max(0, Math.min(1, scrollPosition / scrollRange));
        const probe = scrollPosition + window.innerHeight * .38;
        let currentSection = trackedSections[0];

        trackedSections.slice().sort((a, b) => a.offsetTop - b.offsetTop).forEach((section) => {
          if (section.offsetTop <= probe) currentSection = section;
        });

        const currentId = currentSection?.id || "top";
        siteHeader.classList.toggle("is-scrolled", currentId !== "top");
        backToTop.classList.toggle("is-visible", scrollPosition > window.innerHeight * .62);
        scrollProgress.style.setProperty("--page-progress", pageProgress.toFixed(4));
        if (sectionStatus) sectionStatus.textContent = sectionLabels[currentId] || "首页";

        navLinks.forEach((link) => {
          const isActive = link.dataset.sectionLink === currentId;
          link.classList.toggle("is-active", isActive);
          if (isActive) {
            link.setAttribute("aria-current", "page");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      };

      const requestScrollUiSync = () => {
        window.cancelAnimationFrame(scrollUiFrame);
        scrollUiFrame = window.requestAnimationFrame(syncScrollUi);
      };

      window.addEventListener("scroll", requestScrollUiSync, { passive: true });
      window.addEventListener("resize", requestScrollUiSync, { passive: true });
      backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      });
      syncScrollUi();

      const revealTargets = Array.from(document.querySelectorAll(
        ".about__visual, .about__copy, .works .section-heading, .work-card, " +
        ".manifesto__inner, .booking .section-heading, .booking-step, .service-intro__header, " +
        ".service-journey, .service-plan, .service-basics, .service-disclosures, " +
        ".contact__lead, .contact-grid > div, .contact-copy-picker, .site-footer"
      ));

      const revealGroupCounts = new Map();
      revealTargets.forEach((target) => {
        const group = target.closest("section, .site-footer") || document.body;
        const order = revealGroupCounts.get(group) || 0;
        revealGroupCounts.set(group, order + 1);
        target.setAttribute("data-reveal", "");
        target.classList.add("reveal-pending");
        target.dataset.revealKind = target.matches(".about__visual, .work-card")
          ? "image"
          : target.matches(".section-heading, .about__copy, .manifesto__inner, .contact__lead")
            ? "title"
            : "cell";
        target.style.setProperty("--reveal-delay", `${Math.min(order * 90, 270)}ms`);
      });

      if (reduceMotion || !("IntersectionObserver" in window)) {
        revealTargets.forEach((target) => {
          target.classList.add("is-visible");
          target.classList.remove("reveal-pending");
        });
      } else {
        const revealObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            window.setTimeout(() => entry.target.classList.remove("reveal-pending"), 1700);
            observer.unobserve(entry.target);
          });
        }, { threshold: .02, rootMargin: "0px 0px 14% 0px" });

        revealTargets.forEach((target) => revealObserver.observe(target));
      }

      const sectionMotionTargets = Array.from(document.querySelectorAll(".section, .manifesto"));
      if (reduceMotion || !("IntersectionObserver" in window)) {
        sectionMotionTargets.forEach((section) => section.classList.add("section-in-view"));
      } else {
        const sectionObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle("section-in-view", entry.isIntersecting);
          });
        }, { threshold: .08, rootMargin: "-8% 0px -8% 0px" });
        sectionMotionTargets.forEach((section) => sectionObserver.observe(section));
      }

      if (canUsePointerEffects) {
        hero.addEventListener("pointermove", (event) => {
          const bounds = hero.getBoundingClientRect();
          const normalizedX = (event.clientX - bounds.left) / bounds.width - .5;
          const normalizedY = (event.clientY - bounds.top) / bounds.height - .5;
          hero.style.setProperty("--hero-x", `${(normalizedX * -7).toFixed(2)}px`);
          hero.style.setProperty("--hero-y", `${(normalizedY * -5).toFixed(2)}px`);
        }, { passive: true });

        hero.addEventListener("pointerleave", () => {
          hero.style.setProperty("--hero-x", "0px");
          hero.style.setProperty("--hero-y", "0px");
        });

        const pointerSurfaces = Array.from(document.querySelectorAll(
          ".about__visual, .work-card, .booking-step, .contact-grid > div, .contact-copy-option"
        ));
        pointerSurfaces.forEach((surface) => {
          surface.classList.add("motion-surface");
          surface.addEventListener("pointermove", (event) => {
            const bounds = surface.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width) * 100;
            const y = ((event.clientY - bounds.top) / bounds.height) * 100;
            surface.style.setProperty("--pointer-x", `${x.toFixed(1)}%`);
            surface.style.setProperty("--pointer-y", `${y.toFixed(1)}%`);
            if (surface.matches(".work-card")) {
              const image = surface.querySelector("[data-photo]");
              image?.style.setProperty("--media-x", `${((x - 50) * -.055).toFixed(2)}px`);
              image?.style.setProperty("--media-y", `${((y - 50) * -.045).toFixed(2)}px`);
            }
          }, { passive: true });
          surface.addEventListener("pointerleave", () => {
            surface.style.setProperty("--pointer-x", "50%");
            surface.style.setProperty("--pointer-y", "50%");
            const image = surface.querySelector("[data-photo]");
            image?.style.setProperty("--media-x", "0px");
            image?.style.setProperty("--media-y", "0px");
          });
        });

        const magneticTargets = Array.from(document.querySelectorAll(
          ".header-cta, .back-to-top, .gallery-page__back"
        ));
        magneticTargets.forEach((target) => {
          target.addEventListener("pointermove", (event) => {
            const bounds = target.getBoundingClientRect();
            const offsetX = event.clientX - (bounds.left + bounds.width / 2);
            const offsetY = event.clientY - (bounds.top + bounds.height / 2);
            target.style.setProperty("--magnet-x", `${Math.max(-5, Math.min(5, offsetX * .13)).toFixed(2)}px`);
            target.style.setProperty("--magnet-y", `${Math.max(-4, Math.min(4, offsetY * .13)).toFixed(2)}px`);
          }, { passive: true });
          target.addEventListener("pointerleave", () => {
            target.style.setProperty("--magnet-x", "0px");
            target.style.setProperty("--magnet-y", "0px");
          });
        });

        const contactSection = document.getElementById("contact");
        const contactBounds = contactSection.getBoundingClientRect();
        const contactWash = {
          x: contactBounds.width * .5,
          y: contactBounds.height * .35,
          targetX: contactBounds.width * .5,
          targetY: contactBounds.height * .35,
          frame: 0
        };
        const renderContactWash = () => {
          contactWash.x += (contactWash.targetX - contactWash.x) * .085;
          contactWash.y += (contactWash.targetY - contactWash.y) * .085;
          contactSection.style.setProperty("--contact-x", `${contactWash.x.toFixed(2)}px`);
          contactSection.style.setProperty("--contact-y", `${contactWash.y.toFixed(2)}px`);
          if (Math.hypot(contactWash.targetX - contactWash.x, contactWash.targetY - contactWash.y) > .35) {
            contactWash.frame = window.requestAnimationFrame(renderContactWash);
          } else {
            contactWash.frame = 0;
          }
        };
        const scheduleContactWash = () => {
          if (!contactWash.frame) contactWash.frame = window.requestAnimationFrame(renderContactWash);
        };
        contactSection.addEventListener("pointermove", (event) => {
          const bounds = contactSection.getBoundingClientRect();
          contactWash.targetX = event.clientX - bounds.left;
          contactWash.targetY = event.clientY - bounds.top;
          scheduleContactWash();
        }, { passive: true });
        contactSection.addEventListener("pointerleave", () => {
          const bounds = contactSection.getBoundingClientRect();
          contactWash.targetX = bounds.width * .58;
          contactWash.targetY = bounds.height * .42;
          scheduleContactWash();
        }, { passive: true });
      }

      const showToast = (message) => {
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.classList.add("show");
        toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
      };

      const boundEditableItems = new WeakSet();
      const boundImageSlots = new WeakSet();

      const announceWorksChange = (reason = "update") => {
        window.dispatchEvent(new CustomEvent("len:works-changed", { detail: { reason } }));
      };

      const syncWorkCopy = (source) => {
        const workCard = source?.classList?.contains("work-card")
          ? source
          : source?.closest?.(".work-card");
        if (!workCard) return;
        const title = workCard.querySelector("[data-work-title]")?.textContent?.trim() || "未命名作品组";
        const category = workCard.querySelector("figcaption p:not(.work-card__editor-note)")?.textContent?.trim() || "PORTRAIT · STORY";
        const note = workCard.querySelector(".work-card__editor-note")?.textContent?.trim() || "在这里填写本组作品说明。";
        const image = workCard.querySelector("[data-photo]");
        workCard.dataset.exhibitTitle = title;
        workCard.dataset.exhibitNote = note;
        workCard.dataset.reservedTheme = category;
        if (image) image.alt = `${title} 摄影作品`;
      };

      const registerEditable = (item) => {
        if (!item) return;
        if (editing) {
          item.setAttribute("contenteditable", "true");
          item.setAttribute("spellcheck", "false");
        }
        if (boundEditableItems.has(item)) return;
        boundEditableItems.add(item);
        item.addEventListener("paste", (event) => {
          if (!editing) return;
          event.preventDefault();
          const plainText = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, plainText);
        });
        item.addEventListener("input", () => {
          syncWorkCopy(item);
          markAutosaveDirty();
        });
        item.addEventListener("blur", () => {
          if (!item.closest(".work-card")) return;
          syncWorkCopy(item);
          announceWorksChange("copy");
          markAutosaveDirty();
        });
      };

      const refreshEditableItems = () => {
        editableItems = Array.from(document.querySelectorAll("[data-edit]"));
        editableItems.forEach(registerEditable);
      };

      const setEditing = (nextState) => {
        editing = nextState;
        root.classList.toggle("editing", editing);

        refreshEditableItems();
        editableItems.forEach((item) => {
          if (editing) {
            item.setAttribute("contenteditable", "true");
            item.setAttribute("spellcheck", "false");
          } else {
            item.removeAttribute("contenteditable");
            item.removeAttribute("spellcheck");
          }
        });

        editToggle.textContent = editing ? "结束编辑" : "开始编辑";
        hint.textContent = editing
          ? "正在编辑：可新增作品组、修改组别文字；打开作品后可勾选任意图片并批量删除。"
          : "进入编辑后可新增作品组、修改组名/分类/说明；打开任一组可勾选想删除的图片。完成后导出新版 index.html。";

        if (!editing && !galleryManager.hidden) {
          galleryManager.hidden = true;
        }
        refreshImageSlots();
      };

      refreshEditableItems();

      const closeLightbox = () => {
        if (lightbox.hidden) return;
        window.clearTimeout(lightboxTimer);
        lightbox.classList.remove("is-open");
        root.classList.remove("lightbox-open");
        lightboxTimer = window.setTimeout(() => {
          lightbox.hidden = true;
          lightboxImage.removeAttribute("src");
          lightboxCaption.textContent = "";
          lightboxCounter.textContent = "";
          activeGallery = [];
          activeGalleryIndex = 0;
        }, 360);
      };

      const getGallery = (targetImage) => {
        if (!targetImage) return [];
        const source = targetImage.getAttribute("src");
        const stored = targetImage.getAttribute("data-gallery");
        const isImageSource = (item) => typeof item === "string" && (
          item.startsWith("data:image/") ||
          item.startsWith("assets/") ||
          item.startsWith("./assets/")
        );
        let storedImages = [];

        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            storedImages = parsed.filter(isImageSource);
          } catch (error) {
            targetImage.removeAttribute("data-gallery");
          }
        }

        return Array.from(new Set([
          ...(isImageSource(source) ? [source] : []),
          ...storedImages
        ]));
      };

      const getSlotLabel = (slot, targetImage) => {
        const workCard = slot.closest(".work-card");
        const workTitle = workCard?.querySelector("figcaption h3")?.textContent?.trim();
        const reservedTitle = workCard?.dataset.exhibitTitle?.trim();
        return workTitle || reservedTitle || targetImage?.alt || "LEN 摄影作品";
      };

      let galleryPageCenters = [];
      let galleryPageWidth = 0;
      const measureGalleryPage = () => {
        galleryPageWidth = galleryPageTrack.clientWidth;
        galleryPageCenters = Array.from(galleryPageTrack.children, item => item.offsetLeft + item.offsetWidth / 2);
      };
      const updateGalleryPagePosition = () => {
        galleryPageScrollFrame = 0;
        const items = galleryPageTrack.children;
        if (!items.length) return;
        const center = galleryPageTrack.scrollLeft + galleryPageWidth / 2;
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        galleryPageCenters.forEach((itemCenter, index) => {
          const distance = Math.abs(itemCenter - center);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        });

        if (activeGalleryIndex === nearestIndex) return;
        activeGalleryIndex = nearestIndex;
        galleryPageCounter.textContent =
          `${String(nearestIndex + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
        galleryPageProgress.style.transform = `scaleX(${(nearestIndex + 1) / items.length})`;
      };

      const scheduleGalleryPagePosition = () => {
        if (!galleryPageScrollFrame) galleryPageScrollFrame = window.requestAnimationFrame(updateGalleryPagePosition);
      };

      const closeGalleryPage = (fromHistory = false) => {
        if (galleryPage.hidden) return;
        window.clearTimeout(galleryPageTimer);
        galleryPage.classList.remove("is-open");
        root.classList.remove("gallery-page-open");
        galleryPageTimer = window.setTimeout(() => {
          galleryPage.hidden = true;
          galleryPageTrack.replaceChildren();
          galleryPageCenters = [];
          activeGallery = [];
          activeGalleryIndex = 0;
          if (galleryPageTrigger) galleryPageTrigger.focus();
          galleryPageTrigger = null;
        }, reduceMotion ? 20 : 480);

        if (!fromHistory && history.state?.lenGallery) {
          history.back();
        }
      };

      const openGalleryPage = (slot) => {
        const targetImage = slot.querySelector("[data-photo]");
        const gallery = getGallery(targetImage);
        if (!targetImage || targetImage.hidden || !gallery.length) return;

        window.clearTimeout(galleryPageTimer);
        activeGallery = gallery;
        activeGalleryIndex = 0;
        activeGalleryLabel = getSlotLabel(slot, targetImage);
        galleryPageTrigger = slot;
        galleryPageTitle.textContent = activeGalleryLabel;
        galleryPageTrack.replaceChildren();

        gallery.forEach((source, index) => {
          const figure = document.createElement("figure");
          const image = document.createElement("img");
          const caption = document.createElement("figcaption");
          figure.className = "gallery-page__item";
          image.src = source;
          image.alt = `${activeGalleryLabel} ${index + 1}`;
          image.decoding = "async";
          image.loading = index < 2 ? "eager" : "lazy";
          image.fetchPriority = index === 0 ? "high" : "low";
          image.draggable = false;
          caption.textContent = `${String(index + 1).padStart(2, "0")} / ${String(gallery.length).padStart(2, "0")}`;
          figure.append(image, caption);
          galleryPageTrack.append(figure);
        });

        galleryPageCounter.textContent = `01 / ${String(gallery.length).padStart(2, "0")}`;
        galleryPageProgress.style.transform = `scaleX(${1 / gallery.length})`;
        galleryPage.hidden = false;
        galleryPageTrack.scrollLeft = 0;
        root.classList.add("gallery-page-open");
        window.requestAnimationFrame(() => {
          galleryPage.classList.add("is-open");
          galleryPageTrack.focus();
          measureGalleryPage();
          updateGalleryPagePosition();
        });

        const route = `#gallery-${slot.dataset.imageSlot || "work"}`;
        if (!history.state?.lenGallery) {
          history.pushState({ ...(history.state || {}), lenGallery: true }, "", route);
        }
      };

      const renderLightboxImage = () => {
        const source = activeGallery[activeGalleryIndex];
        if (!source) return;
        lightboxImage.src = source;
        lightboxImage.alt = `${activeGalleryLabel} ${activeGalleryIndex + 1}`;
        lightboxCaption.textContent = activeGalleryLabel;
        lightboxCounter.textContent = activeGallery.length > 1
          ? `· ${String(activeGalleryIndex + 1).padStart(2, "0")} / ${String(activeGallery.length).padStart(2, "0")}`
          : "";
        lightboxPrev.disabled = activeGallery.length < 2;
        lightboxNext.disabled = activeGallery.length < 2;
      };

      const changeLightboxImage = (direction) => {
        if (activeGallery.length < 2) return;
        activeGalleryIndex = (
          activeGalleryIndex + direction + activeGallery.length
        ) % activeGallery.length;
        renderLightboxImage();
      };

      const openLightbox = (slot) => {
        const targetImage = slot.querySelector("[data-photo]");
        const gallery = getGallery(targetImage);
        if (!targetImage || targetImage.hidden || !gallery.length) return;

        window.clearTimeout(lightboxTimer);
        activeGallery = gallery;
        activeGalleryIndex = 0;
        activeGalleryLabel = getSlotLabel(slot, targetImage);
        renderLightboxImage();
        lightbox.hidden = false;
        root.classList.add("lightbox-open");
        window.requestAnimationFrame(() => lightbox.classList.add("is-open"));
        lightboxClose.focus();
      };

      const writeGallery = (slot, gallery) => {
        const targetImage = slot.querySelector("[data-photo]");
        const placeholder = slot.querySelector(".photo-placeholder, .card-placeholder");
        const cleaned = Array.from(new Set(gallery.filter((item) => typeof item === "string" && (
          item.startsWith("data:image/") ||
          item.startsWith("assets/") ||
          item.startsWith("./assets/")
        ))));
        if (!targetImage) return;
        if (!cleaned.length) {
          targetImage.removeAttribute("src");
          targetImage.removeAttribute("data-gallery");
          targetImage.hidden = true;
          if (placeholder) placeholder.hidden = false;
          refreshImageInteractivity(slot);
          syncWorkCopy(slot);
          announceWorksChange("images");
          markAutosaveDirty();
          return;
        }

        targetImage.src = cleaned[0];
        targetImage.hidden = false;
        if (cleaned.length > 1) {
          targetImage.setAttribute("data-gallery", JSON.stringify(cleaned.slice(1)));
        } else {
          targetImage.removeAttribute("data-gallery");
        }
        if (placeholder) placeholder.hidden = true;
        refreshImageInteractivity(slot);
        syncWorkCopy(slot);
        announceWorksChange("images");
        markAutosaveDirty();
      };

      const refreshImageInteractivity = (slot) => {
        const targetImage = slot.querySelector("[data-photo]");
        const placeholder = slot.querySelector(".photo-placeholder, .card-placeholder");
        const gallery = getGallery(targetImage);
        const hasPhoto = Boolean(targetImage && !targetImage.hidden && gallery.length);
        const workCard = slot.closest(".work-card");

        if (placeholder) placeholder.hidden = hasPhoto;

        slot.classList.toggle("has-photo", hasPhoto);
        slot.classList.toggle("has-gallery", gallery.length > 1);
        slot.dataset.galleryCount = String(gallery.length);

        if (workCard) {
          workCard.dataset.emptySlot = String(!hasPhoto);
          workCard.classList.toggle("work-card--empty", !hasPhoto);
          if (hasPhoto) {
            const reservedTitle = workCard.dataset.exhibitTitle || "";
            const reservedTheme = workCard.dataset.reservedTheme || "";
            const heading = workCard.querySelector("figcaption h3");
            const category = workCard.querySelector("figcaption p:not(.work-card__editor-note)");
            const number = workCard.querySelector("figcaption b");
            if (heading && !heading.textContent.trim()) heading.textContent = reservedTitle;
            if (category && !category.textContent.trim()) category.textContent = reservedTheme;
            if (number && !number.textContent.trim()) {
              number.textContent = String(workCard.dataset.reservedGroup).padStart(2, "0");
            }
            if (targetImage && !targetImage.alt) targetImage.alt = `${reservedTitle || "LEN"} 摄影作品`;
          }
        }

        if (hasPhoto || (editing && isLocalFile)) {
          const label = getSlotLabel(slot, targetImage);
          slot.setAttribute("role", "button");
          slot.setAttribute("tabindex", "0");
          slot.setAttribute(
            "aria-label",
            !hasPhoto
              ? `${label}，点击添加作品图片`
              : gallery.length > 1
              ? `${label}，点击进入${gallery.length}张组图页面`
              : `${label}，点击进入作品页面`
          );
        } else {
          slot.removeAttribute("role");
          slot.removeAttribute("tabindex");
          slot.removeAttribute("aria-label");
        }
      };

      const updateSelectionControls = (galleryLength) => {
        const selectedCount = selectedGalleryIndexes.size;
        gallerySelectionMeta.textContent = galleryLength
          ? `已选择 ${selectedCount} / ${galleryLength} 张`
          : "当前没有图片";
        gallerySelectAll.disabled = galleryLength === 0;
        gallerySelectAll.textContent = galleryLength > 0 && selectedCount === galleryLength
          ? "取消全选"
          : "全选图片";
        galleryDeleteSelected.disabled = selectedCount === 0;
      };

      const renderGallerySelection = (gallery) => {
        galleryImageList.replaceChildren();
        selectedGalleryIndexes = new Set(
          Array.from(selectedGalleryIndexes).filter((index) => index >= 0 && index < gallery.length)
        );

        if (!gallery.length) {
          const empty = document.createElement("p");
          empty.className = "gallery-manager__empty";
          empty.textContent = "尚未添加图片，请先选择“添加封面”或“添加组图”。";
          galleryImageList.append(empty);
          updateSelectionControls(0);
          return;
        }

        gallery.forEach((source, index) => {
          const option = document.createElement("label");
          const checkbox = document.createElement("input");
          const preview = document.createElement("img");
          const caption = document.createElement("span");
          option.className = "gallery-manager__image-option";
          option.classList.toggle("is-selected", selectedGalleryIndexes.has(index));
          checkbox.type = "checkbox";
          checkbox.checked = selectedGalleryIndexes.has(index);
          checkbox.dataset.galleryIndex = String(index);
          checkbox.setAttribute("aria-label", `${index === 0 ? "封面" : `第 ${index + 1} 张`}，勾选后删除`);
          preview.src = source;
          preview.alt = "";
          preview.loading = "lazy";
          preview.decoding = "async";
          caption.textContent = index === 0 ? "封面 · 01" : `组图 · ${String(index + 1).padStart(2, "0")}`;
          checkbox.addEventListener("change", () => {
            if (checkbox.checked) selectedGalleryIndexes.add(index);
            else selectedGalleryIndexes.delete(index);
            option.classList.toggle("is-selected", checkbox.checked);
            updateSelectionControls(gallery.length);
          });
          option.append(checkbox, preview, caption);
          galleryImageList.append(option);
        });

        updateSelectionControls(gallery.length);
      };

      const getWorkGroupSlots = () => Array.from(
        worksGrid?.querySelectorAll(".work-card [data-image-slot]") || []
      );

      const updateGalleryGroupNavigator = () => {
        if (!galleryGroupNavigator || !galleryGroupPrevious || !galleryGroupNext || !galleryGroupIndex) return;
        const slots = getWorkGroupSlots();
        const currentIndex = slots.indexOf(activeImageSlot);
        const isWorkGroup = currentIndex >= 0;
        galleryGroupNavigator.hidden = !isWorkGroup;
        if (!isWorkGroup) return;

        galleryGroupIndex.textContent =
          String(currentIndex + 1).padStart(2, "0") + " / " + String(slots.length).padStart(2, "0");
        galleryGroupPrevious.disabled = currentIndex <= 0;
        galleryGroupNext.disabled = currentIndex >= slots.length - 1;
      };

      const updateGalleryManager = () => {
        if (!activeImageSlot) return;
        const targetImage = activeImageSlot.querySelector("[data-photo]");
        const gallery = getGallery(targetImage);
        const label = getSlotLabel(activeImageSlot, targetImage);
        const workCard = activeImageSlot.closest(".work-card");
        const category = workCard?.querySelector("figcaption p:not(.work-card__editor-note)")?.textContent?.trim() || "";
        const note = workCard?.querySelector(".work-card__editor-note")?.textContent?.trim() || workCard?.dataset.exhibitNote || "";
        galleryManagerTitle.textContent = label;
        galleryManagerMeta.textContent = `当前共 ${gallery.length} 张图片。可修改本组文字、追加图片，或勾选任意图片后删除。`;
        galleryGroupFields.hidden = !workCard;
        galleryGroupTitle.value = workCard?.querySelector("[data-work-title]")?.textContent?.trim() || "";
        galleryGroupCategory.value = category;
        galleryGroupNote.value = note;
        galleryReplaceCover.textContent = gallery.length ? "更换封面" : "添加封面";
        galleryDeleteGroup.hidden = !workCard;
        galleryDeleteGroup.disabled = !workCard || document.querySelectorAll("#works .work-card").length <= 1;
        renderGallerySelection(gallery);
        updateGalleryGroupNavigator();
      };

      const commitGalleryCopy = (silent = false) => {
        const workCard = activeImageSlot?.closest(".work-card");
        if (!workCard) return false;
        const copy = workCard.querySelector("figcaption > div");
        const title = workCard.querySelector("[data-work-title]");
        let category = workCard.querySelector("figcaption p:not(.work-card__editor-note)");
        let note = workCard.querySelector(".work-card__editor-note");
        const nextTitle = galleryGroupTitle.value.trim() || "未命名作品组";
        const nextCategory = galleryGroupCategory.value.trim() || "PORTRAIT · STORY";
        const nextNote = galleryGroupNote.value.trim() || "在这里填写本组作品说明。";
        const changed = !category || !note ||
          title?.textContent?.trim() !== nextTitle ||
          category?.textContent?.trim() !== nextCategory ||
          note?.textContent?.trim() !== nextNote;

        if (!changed) return false;

        if (!category) {
          category = document.createElement("p");
          category.dataset.edit = "";
          copy?.append(category);
        }
        if (!note) {
          note = document.createElement("p");
          note.className = "work-card__editor-note";
          note.dataset.edit = "";
          copy?.append(note);
        }
        if (title) title.textContent = nextTitle;
        category.textContent = nextCategory;
        note.textContent = nextNote;
        registerEditable(category);
        registerEditable(note);
        refreshEditableItems();
        syncWorkCopy(workCard);
        announceWorksChange("copy");
        markAutosaveDirty();
        updateGalleryManager();
        if (!silent) showToast("组别名称、分类与说明已保存");
        return true;
      };

      const openGalleryManager = (slot) => {
        if (!slot) return;
        const switchingGroups = !galleryManager.hidden && activeImageSlot && activeImageSlot !== slot;
        if (switchingGroups) {
          commitGalleryCopy(true);
        }
        activeImageSlot = slot;
        selectedGalleryIndexes = new Set();
        updateGalleryManager();
        galleryManager.hidden = false;
        (switchingGroups ? galleryGroupTitle : galleryReplaceCover)?.focus();
      };

      const moveGalleryGroup = (direction) => {
        const slots = getWorkGroupSlots();
        const currentIndex = slots.indexOf(activeImageSlot);
        const nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= slots.length) return;
        openGalleryManager(slots[nextIndex]);
      };

      const closeGalleryManager = () => {
        if (galleryManager.hidden) return;
        galleryManager.hidden = true;
      };

      const chooseGalleryFiles = (action) => {
        if (!activeImageSlot) return;
        fileAction = action;
        fileInput.multiple = action === "add";
        fileInput.value = "";
        fileInput.click();
      };

      const bindImageSlot = (slot) => {
        if (!slot || boundImageSlots.has(slot)) return;
        boundImageSlots.add(slot);
        refreshImageInteractivity(slot);

        slot.addEventListener("click", () => {
          if (editing && isLocalFile) {
            openGalleryManager(slot);
            return;
          }

          openGalleryPage(slot);
        });

        slot.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (editing && isLocalFile) {
            openGalleryManager(slot);
          } else {
            openGalleryPage(slot);
          }
        });
      };

      const refreshImageSlots = () => {
        imageSlots = Array.from(document.querySelectorAll("[data-image-slot]"));
        imageSlots.forEach((slot) => {
          bindImageSlot(slot);
          refreshImageInteractivity(slot);
        });
      };

      refreshImageSlots();
      document.querySelectorAll("#works .work-card").forEach(syncWorkCopy);

      galleryPageBack.addEventListener("click", () => closeGalleryPage(false));
      galleryPageTrack.addEventListener("scroll", scheduleGalleryPagePosition, { passive: true });
      if ("ResizeObserver" in window) {
        new ResizeObserver(() => {
          if (galleryPage.hidden) return;
          measureGalleryPage();
          updateGalleryPagePosition();
        }).observe(galleryPageTrack);
      }
      window.addEventListener("pageshow", () => {
        if (!galleryPage.hidden) { measureGalleryPage(); updateGalleryPagePosition(); }
      }, { passive: true });
      galleryPageTrack.addEventListener("wheel", (event) => {
        if (galleryPage.hidden || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        event.preventDefault();
        galleryPageTrack.scrollBy({ left: event.deltaY * 1.2, behavior: "auto" });
      }, { passive: false });
      window.addEventListener("popstate", () => {
        if (!galleryPage.hidden) closeGalleryPage(true);
      });

      lightboxClose.addEventListener("click", closeLightbox);
      lightboxPrev.addEventListener("click", () => changeLightboxImage(-1));
      lightboxNext.addEventListener("click", () => changeLightboxImage(1));
      lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) closeLightbox();
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          if (root.classList.contains("menu-open")) {
            setMenuOpen(false);
            menuToggle.focus();
          } else if (!galleryManager.hidden) {
            closeGalleryManager();
          } else if (!galleryPage.hidden) {
            closeGalleryPage(false);
          } else if (!lightbox.hidden) {
            closeLightbox();
          }
        }

        if (!galleryPage.hidden && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          galleryPageTrack.scrollBy({
            left: (event.key === "ArrowRight" ? 1 : -1) * galleryPageTrack.clientWidth * .84,
            behavior: "smooth"
          });
        }

        if (!lightbox.hidden && event.key === "ArrowLeft") {
          changeLightboxImage(-1);
        }

        if (!lightbox.hidden && event.key === "ArrowRight") {
          changeLightboxImage(1);
        }
      });

      galleryReplaceCover.addEventListener("click", () => chooseGalleryFiles("cover"));
      galleryAddImages.addEventListener("click", () => chooseGalleryFiles("add"));
      galleryGroupPrevious?.addEventListener("click", () => moveGalleryGroup(-1));
      galleryGroupNext?.addEventListener("click", () => moveGalleryGroup(1));
      [galleryGroupTitle, galleryGroupCategory, galleryGroupNote].forEach((field) => {
        field?.addEventListener("input", markAutosaveDirty);
      });

      gallerySaveCopy.addEventListener("click", () => {
        if (!commitGalleryCopy()) {
          showToast("当前组别没有新的文字改动");
        }
      });

      gallerySelectAll.addEventListener("click", () => {
        if (!activeImageSlot) return;
        const targetImage = activeImageSlot.querySelector("[data-photo]");
        const gallery = getGallery(targetImage);
        if (!gallery.length) return;
        selectedGalleryIndexes = selectedGalleryIndexes.size === gallery.length
          ? new Set()
          : new Set(gallery.map((_, index) => index));
        renderGallerySelection(gallery);
      });

      galleryDeleteSelected.addEventListener("click", () => {
        if (!activeImageSlot || !selectedGalleryIndexes.size) return;
        const targetImage = activeImageSlot.querySelector("[data-photo]");
        const gallery = getGallery(targetImage);
        const remaining = gallery.filter((_, index) => !selectedGalleryIndexes.has(index));
        if (activeImageSlot.dataset.imageSlot === "hero" && !remaining.length) {
          showToast("首页主视觉至少需要保留 1 张图片");
          return;
        }
        const removedCount = gallery.length - remaining.length;
        writeGallery(activeImageSlot, remaining);
        selectedGalleryIndexes = new Set();
        updateGalleryManager();
        showToast(`已删除所选 ${removedCount} 张图片`);
      });

      const renumberWorkGroups = () => {
        Array.from(worksGrid?.querySelectorAll(".work-card") || []).forEach((card, index) => {
          const number = index + 1;
          card.dataset.reservedGroup = String(number);
          const numberLabel = card.querySelector("figcaption b");
          const placeholderLabel = card.querySelector(".card-placeholder span");
          if (numberLabel) numberLabel.textContent = String(number).padStart(2, "0");
          if (placeholderLabel) placeholderLabel.textContent = `PORTRAIT / ${String(number).padStart(2, "0")}`;
        });
      };

      const createWorkGroup = () => {
        if (!worksGrid || !isLocalFile) return;
        if (!editing) setEditing(true);
        const cards = Array.from(worksGrid.querySelectorAll(".work-card"));
        if (cards.length >= 24) {
          showToast("作品组最多可建立 24 组");
          return;
        }
        const usedIds = new Set(cards.map((card) => card.dataset.workId));
        let serial = cards.length + 1;
        while (usedIds.has(`work-${serial}`)) serial += 1;
        const visibleNumber = cards.length + 1;
        const card = document.createElement("figure");
        card.className = "work-card work-card--empty";
        card.dataset.workId = `work-${serial}`;
        card.dataset.emptySlot = "true";
        card.dataset.reservedGroup = String(visibleNumber);
        card.dataset.reservedTheme = "PORTRAIT · STORY";
        card.dataset.exhibitTitle = `新作品组 ${String(visibleNumber).padStart(2, "0")}`;
        card.dataset.exhibitNote = "在这里填写本组作品说明。";
        card.innerHTML = `
          <div class="media" data-image-slot="work-${serial}" data-gallery-count="0">
            <div class="card-placeholder tone-${((visibleNumber - 1) % 6) + 1}"><span>PORTRAIT / ${String(visibleNumber).padStart(2, "0")}</span></div>
            <img data-photo="" alt="新作品组摄影作品" hidden decoding="async" loading="lazy" fetchpriority="low">
          </div>
          <figcaption>
            <div>
              <h3 data-edit="" data-work-title="">新作品组 ${String(visibleNumber).padStart(2, "0")}</h3>
              <p data-edit="">PORTRAIT · STORY</p>
              <p class="work-card__editor-note" data-edit="">在这里填写本组作品说明。</p>
            </div>
            <b>${String(visibleNumber).padStart(2, "0")}</b>
          </figcaption>`;
        worksGrid.append(card);
        renumberWorkGroups();
        refreshEditableItems();
        refreshImageSlots();
        syncWorkCopy(card);
        announceWorksChange("add-group");
        markAutosaveDirty();
        openGalleryManager(card.querySelector("[data-image-slot]"));
        showToast(`已新增第 ${visibleNumber} 组，可立即修改文字并添加图片`);
      };

      galleryDeleteGroup.addEventListener("click", () => {
        const workCard = activeImageSlot?.closest(".work-card");
        if (!workCard) return;
        const cards = Array.from(worksGrid?.querySelectorAll(".work-card") || []);
        if (cards.length <= 1) {
          showToast("至少需要保留 1 个作品组");
          return;
        }
        const label = getSlotLabel(activeImageSlot, activeImageSlot.querySelector("[data-photo]"));
        if (!window.confirm(`确定删除“${label}”整个作品组吗？`)) return;
        workCard.remove();
        activeImageSlot = null;
        selectedGalleryIndexes = new Set();
        closeGalleryManager();
        renumberWorkGroups();
        refreshEditableItems();
        refreshImageSlots();
        announceWorksChange("delete-group");
        markAutosaveDirty();
        showToast(`已删除作品组“${label}”`);
      });

      addWorkGroupButton.addEventListener("click", createWorkGroup);
      galleryManagerClose.addEventListener("click", closeGalleryManager);
      galleryManager.addEventListener("click", (event) => {
        if (event.target === galleryManager) closeGalleryManager();
      });

      const loadImage = (file) => new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("无法读取图片"));
        };
        image.src = objectUrl;
      });

      const compressImage = async (file, options = {}) => {
        const image = await loadImage(file);
        const maxEdge = options.maxEdge || 2400;
        const quality = options.quality || .89;
        const ratio = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#11120f";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        return canvas.toDataURL("image/webp", quality);
      };

      fileInput.addEventListener("change", async () => {
        const selectedFiles = Array.from(fileInput.files || []);
        if (!selectedFiles.length || !activeImageSlot) return;

        if (selectedFiles.some((file) => !/^image\/(jpeg|png|webp|avif)$/.test(file.type))) {
          showToast("请选择 JPG、PNG、WebP 或 AVIF 图片");
          return;
        }

        if (selectedFiles.some((file) => file.size > 20 * 1024 * 1024)) {
          showToast("单张原图请控制在 20MB 以内");
          return;
        }

        try {
          const targetImage = activeImageSlot.querySelector("[data-photo]");
          const currentGallery = getGallery(targetImage);
          const available = fileAction === "add"
            ? Math.max(0, 12 - currentGallery.length)
            : 1;
          const filesToProcess = selectedFiles.slice(0, available);

          if (!filesToProcess.length) {
            showToast("每组作品最多可保存 12 张图片");
            return;
          }

          showToast(`正在处理 ${filesToProcess.length} 张图片…`);
          const dataUrls = [];
          const isHeroImage = activeImageSlot.dataset.imageSlot === "hero";
          for (const file of filesToProcess) {
            dataUrls.push(await compressImage(file, {
              maxEdge: isHeroImage ? 3200 : 2400,
              quality: isHeroImage ? .92 : .89
            }));
          }

          const nextGallery = fileAction === "cover"
            ? [dataUrls[0], ...currentGallery.slice(1)]
            : [...currentGallery, ...dataUrls];

          writeGallery(activeImageSlot, nextGallery.slice(0, 12));
          updateGalleryManager();
          showToast(
            fileAction === "cover"
              ? "封面已更换，附加组图已保留"
              : `已添加 ${dataUrls.length} 张组图，记得导出新文件`
          );
        } catch (error) {
          showToast("图片处理失败，请换一组图片重试");
        }
      });

      editToggle.addEventListener("click", () => {
        if (!isLocalFile) return;
        setEditing(!editing);
        showToast(editing ? "编辑模式已开启" : "编辑内容已保留在当前页面");
      });

      const buildExportHtml = () => {
        const clone = document.documentElement.cloneNode(true);
        clone.classList.remove(
          "local-mode",
          "editing",
          "intro-lock",
          "intro-reveal",
          "lightbox-open",
          "gallery-page-open",
          "menu-open",
          "len-touch",
          "spatial-tier-low",
          "spatial-tier-high",
          "spatial-v3",
          "quality-low",
          "quality-medium",
          "quality-high",
          "len-wave-active",
          "len-hero-interaction-ready",
          "len-ambient-ready",
          "about-story-lock",
          "about-story-active",
          "works-scroll-engaged",
          "v45-mobile",
          "v45-native-works",
          "v45-mobile-cta-visible",
          "len-returning-today",
          "v55-mobile-stable",
          "v56-mobile-works",
          "v57-ios-motion"
        );
        clone.removeAttribute("data-quality");
        clone.classList.add("intro-lock");

        clone.querySelectorAll("[contenteditable]").forEach((item) => {
          item.removeAttribute("contenteditable");
          item.removeAttribute("spellcheck");
        });

        const clonedIntro = clone.querySelector("#intro");
        const clonedIntroSkip = clone.querySelector("#intro-skip");
        if (clonedIntro) clonedIntro.classList.remove("is-hidden", "is-leaving", "is-ready", "is-imaged");
        if (clonedIntroSkip) {
          clonedIntroSkip.textContent = "跳过 ↗";
          clonedIntroSkip.setAttribute("aria-label", "跳过开屏动画");
        }

        const clonedProgress = clone.querySelector("#intro-progress");
        const clonedProgressFill = clone.querySelector("#intro-progress-fill");
        const clonedProgressValue = clone.querySelector("#intro-progress-value");
        if (clonedProgress) clonedProgress.setAttribute("aria-valuenow", "0");
        if (clonedProgressFill) clonedProgressFill.style.transform = "scaleX(0)";
        if (clonedProgressValue) clonedProgressValue.textContent = "0";

        const clonedHeader = clone.querySelector(".site-header");
        const clonedBackToTop = clone.querySelector("#back-to-top");
        const clonedSectionStatus = clone.querySelector("#section-status");
        const clonedScrollProgress = clone.querySelector("#scroll-progress");
        const clonedMenuToggle = clone.querySelector("#menu-toggle");
        const clonedMobileNav = clone.querySelector("#mobile-nav");
        if (clonedHeader) clonedHeader.classList.remove("is-scrolled");
        if (clonedBackToTop) clonedBackToTop.classList.remove("is-visible");
        if (clonedScrollProgress) clonedScrollProgress.style.removeProperty("--page-progress");
        if (clonedMenuToggle) {
          clonedMenuToggle.setAttribute("aria-expanded", "false");
          clonedMenuToggle.setAttribute("aria-label", "打开导航");
        }
        if (clonedMobileNav) {
          clonedMobileNav.setAttribute("aria-hidden", "true");
          clonedMobileNav.setAttribute("inert", "");
        }
        if (clonedSectionStatus) clonedSectionStatus.textContent = "首页";
        clone.querySelectorAll("[data-section-link]").forEach((link) => {
          link.classList.remove("is-active");
          link.removeAttribute("aria-current");
        });
        clone.querySelectorAll("[data-reveal]").forEach((item) => {
          item.classList.remove("is-visible", "reveal-pending");
          item.removeAttribute("data-reveal-kind");
        });
        clone.querySelectorAll("[data-motion]").forEach((item) => {
          item.removeAttribute("data-motion");
          item.style.removeProperty("translate");
          item.style.removeProperty("--motion-y");
        });
        clone.querySelectorAll(".motion-surface").forEach((item) => {
          item.classList.remove("motion-surface");
          item.style.removeProperty("--pointer-x");
          item.style.removeProperty("--pointer-y");
        });
        clone.querySelectorAll("#contact .contact-float-target, #contact .is-contact-float-tap").forEach((item) => {
          item.classList.remove("contact-float-target", "is-contact-float-tap");
          item.style.removeProperty("--contact-float-x");
          item.style.removeProperty("--contact-float-y");
          item.style.removeProperty("--contact-float-r");
        });
        clone.querySelectorAll("#services .package").forEach((item) => {
          item.classList.remove("is-ink-bloom");
          item.style.removeProperty("--ink-bloom-x");
          item.style.removeProperty("--ink-bloom-y");
        });
        clone.querySelectorAll("[data-photo]").forEach((item) => {
          item.style.removeProperty("--media-x");
          item.style.removeProperty("--media-y");
        });
        clone.querySelectorAll(".header-cta, .back-to-top, .gallery-page__back").forEach((item) => {
          item.style.removeProperty("--magnet-x");
          item.style.removeProperty("--magnet-y");
        });
        const clonedHero = clone.querySelector("#top");
        if (clonedHero) {
          clonedHero.style.removeProperty("--hero-x");
          clonedHero.style.removeProperty("--hero-y");
          [
            "--len-hero-image-x", "--len-hero-image-y", "--len-hero-image-scale",
            "--len-hero-bg-x", "--len-hero-bg-y", "--len-hero-mid-x", "--len-hero-mid-y",
            "--len-hero-copy-x", "--len-hero-copy-y"
          ].forEach((name) => clonedHero.style.removeProperty(name));
        }
        clone.querySelectorAll(".wave-letter").forEach((item) => {
          item.style.removeProperty("--wave-y");
          item.style.removeProperty("--wave-r");
          item.style.removeProperty("--wave-sy");
        });
        clone.querySelectorAll(".hero__statement").forEach((item) => {
          item.classList.remove("is-energized", "is-touch-lift");
          item.style.removeProperty("--statement-x");
          item.style.removeProperty("--statement-y");
        });
        clone.querySelectorAll(".about-rise-managed").forEach((item) => {
          item.classList.remove("about-rise-managed", "is-about-risen");
        });
        clone.querySelectorAll(".is-v43-about-touch").forEach((item) => {
          item.classList.remove("is-v43-about-touch");
        });
        clone.querySelectorAll("[data-portrait-card]").forEach((item) => {
          item.classList.remove("is-portrait-active", "is-len-portrait-interacting");
          [
            "--portrait-x", "--portrait-y",
            "--portrait-tilt-x", "--portrait-tilt-y", "--portrait-tilt-z",
            "--portrait-shift-x", "--portrait-shift-y"
          ].forEach((name) => item.style.removeProperty(name));
        });
        clone.querySelectorAll("#about").forEach((item) => {
          item.classList.remove(
            "about-story-armed", "about-story-complete", "is-about-story-awaiting",
            "is-about-liquid-reveal", "is-about-quick-reveal", "is-about-up-reveal",
            "is-about-letter-unfolding", "is-about-letter-open",
            "is-about-origin-rising", "is-about-depth-reveal", "is-about-preview-target"
          );
        });
        clone.querySelectorAll(".about-letter-preview").forEach((item) => item.remove());
        const clonedEnvelope = clone.querySelector("#about-envelope-experience");
        const clonedEnvelopeButton = clone.querySelector("#about-envelope-open");
        if (clonedEnvelope) {
          clonedEnvelope.className = "about-envelope-experience";
          clonedEnvelope.hidden = true;
          clonedEnvelope.setAttribute("aria-hidden", "true");
        }
        if (clonedEnvelopeButton) clonedEnvelopeButton.setAttribute("disabled", "");
        clone.querySelectorAll(".len-ambient-section").forEach((item) => {
          item.classList.remove("len-ambient-active");
        });
        clone.querySelectorAll(".section-in-view").forEach((item) => {
          item.classList.remove("section-in-view");
        });
        clone.querySelectorAll(".section-spatial-field").forEach((item) => item.remove());
        clone.querySelectorAll("[data-spatial-item]").forEach((item) => {
          item.removeAttribute("data-spatial-item");
          item.removeAttribute("data-spatial-order");
          [
            "--spatial-x", "--spatial-y", "--spatial-z",
            "--spatial-rx", "--spatial-ry", "--spatial-rz",
            "--spatial-scale", "--spatial-opacity", "--spatial-blur",
            "--spatial-clip", "--spatial-origin", "--spatial-hover-y"
          ].forEach((name) => item.style.removeProperty(name));
        });
        clone.querySelectorAll(".spatial-section").forEach((item) => item.classList.remove("spatial-section"));
        clone.querySelectorAll(".spatial-section-v3").forEach((item) => item.classList.remove("spatial-section-v3"));
        clone.querySelectorAll("[data-spatial-stage]").forEach((item) => {
          item.removeAttribute("data-spatial-stage");
          item.classList.remove("is-spatial-visible", "is-spatial-moving");
          item.style.removeProperty("--stage-delay");
          item.style.removeProperty("--stage-depth");
        });
        clone.removeAttribute("data-spatial-motion");

        clone.querySelectorAll(".works-exhibit .work-card").forEach((item) => {
          item.removeAttribute("data-exhibit-active");
          item.removeAttribute("data-ring-end");
          item.removeAttribute("data-depth-current");
          item.removeAttribute("data-depth-outgoing");
          item.removeAttribute("data-depth-incoming");
          item.removeAttribute("data-depth-state");
          item.removeAttribute("data-work-orientation");
          item.removeAttribute("aria-hidden");
          item.classList.remove("is-touch-lift", "is-active", "is-before", "is-after");
          [
            "--exhibit-x", "--exhibit-y", "--exhibit-z", "--exhibit-rx", "--exhibit-ry",
            "--exhibit-rz", "--exhibit-scale", "--exhibit-opacity", "--exhibit-blur",
            "--exhibit-caption", "--ring-x", "--ring-y", "--ring-z", "--ring-scale",
            "--ring-opacity", "--ring-blur", "--ring-ry", "--ring-rz", "--ring-depth", "--ring-saturate",
            "--ring-rx", "--ring-veil",
            "--depth-x", "--depth-y", "--depth-scale", "--depth-opacity",
            "--depth-blur", "--depth-saturate", "--depth-light", "--page-rotate-y", "--page-rotate-z",
            "--work-aspect", "--work-responsive-width", "--work-focus-width",
            "z-index", "pointer-events"
          ].forEach((name) => item.style.removeProperty(name));
        });
        clone.querySelectorAll(".works-exhibit [data-image-slot]").forEach((item) => {
          item.removeAttribute("aria-current");
          item.style.removeProperty("--work-ratio");
          const image = item.querySelector("[data-photo]");
          if (image && !image.hidden && image.getAttribute("src")) item.setAttribute("tabindex", "0");
          else item.removeAttribute("tabindex");
        });
        const clonedExhibitScene = clone.querySelector(".works-exhibit__scene");
        if (clonedExhibitScene) {
          [
            "--exhibit-orb-x", "--exhibit-orb-y", "--exhibit-orb-scale",
            "--exhibit-shadow-x", "--exhibit-shadow-y", "--exhibit-shadow-scale",
            "--exhibit-shadow-opacity", "--exhibit-shadow-rotation",
            "--exhibit-light-x", "--exhibit-light-y", "--exhibit-light-opacity",
            "--exhibit-light-scale", "--exhibit-light-rotation",
            "--exhibit-poly-x", "--exhibit-poly-y", "--exhibit-poly-z",
            "--exhibit-poly-scale", "--exhibit-poly-opacity", "--exhibit-poly-blur",
            "--exhibit-poly-rx", "--exhibit-poly-ry", "--exhibit-poly-rz",
            "--ring-scene-pulse", "--tunnel-offset",
            "--depth-phase",
            "--v6-ball-x", "--v6-ball-y", "--v6-ball-z", "--v6-ball-scale",
            "--v6-ball-opacity", "--v6-ball-blur", "--v6-ball-spin",
            "--v6-ball-shadow-y", "--v6-ball-shadow-opacity", "--v6-ball-shadow-scale"
          ].forEach((name) => {
            clonedExhibitScene.style.removeProperty(name);
          });
        }
        clone.querySelectorAll("#works .works-v18-float, #works .plan-float-target, #works .is-plan-float-tap").forEach((item) => {
          item.classList.remove("works-v18-float", "plan-float-target", "is-plan-float-tap", "is-v16-copy-jitter");
          ["--plan-float-x", "--plan-float-y", "--plan-float-r"].forEach((name) => item.style.removeProperty(name));
        });
        const clonedExhibitHud = clone.querySelector(".works-exhibit__hud");
        if (clonedExhibitHud) {
          clonedExhibitHud.classList.remove("is-story-changing", "is-copy-lifted", "is-touch-lift", "is-copy-switching");
          clonedExhibitHud.removeAttribute("data-exhibit-active");
          clonedExhibitHud.removeAttribute("data-scroll-state");
        }
        const clonedExhibitSticky = clone.querySelector(".works-exhibit__sticky");
        if (clonedExhibitSticky) {
          clonedExhibitSticky.classList.remove(
            "is-page-turning", "is-awaiting-second", "is-stage-focused",
            "is-mobile-direct-focus", "is-copy-hidden", "is-switching", "is-releasing", "is-initializing", "is-dual-handoff",
            "is-gesture-active"
          );
          clonedExhibitSticky.style.removeProperty("--works-progress");
          clonedExhibitSticky.style.removeProperty("--depth-position");
          clonedExhibitSticky.style.removeProperty("--depth-phase");
          clonedExhibitSticky.style.removeProperty("--gesture-x");
          clonedExhibitSticky.style.removeProperty("--gesture-y");
          clonedExhibitSticky.removeAttribute("aria-busy");
        }
        clone.querySelectorAll(".gesture-light-pulse, .ink-ripple, .plan-render-field").forEach((item) => item.remove());
        clone.querySelectorAll(".is-ink-rendering").forEach(item => item.classList.remove("is-ink-rendering"));
        clone.querySelector("#works .works-grid")?.removeAttribute("data-mobile-controller");
        clone.querySelectorAll("[data-mobile-work-current]").forEach(item => item.removeAttribute("data-mobile-work-current"));
        clone.querySelector("#works")?.classList.remove("v56-description-open");
        clone.querySelectorAll(".v45-copy-feedback").forEach((item) => item.remove());
        clone.querySelector(".works-step-rail")?.replaceChildren();
        const clonedIndicatorTrack = clone.querySelector(".works-depth-indicator__track");
        clonedIndicatorTrack?.style.removeProperty("--indicator-progress");
        clonedIndicatorTrack?.setAttribute("aria-valuenow", "1");
        clone.querySelector("#works-depth-indicator-ball")?.style.removeProperty("--indicator-x");
        const clonedScrollHint = clone.querySelector("#works-scroll-hint");
        if (clonedScrollHint) clonedScrollHint.textContent = "轻滚一次 · 先聚焦当前作品";
        clone.querySelector(".works-loop-controls")?.style.removeProperty("--works-progress");
        const clonedWorksControlStatus = clone.querySelector("[data-works-control-status]");
        const clonedPopulatedCards = Array.from(clone.querySelectorAll("#works .work-card")).filter((card) => {
          const image = card.querySelector("[data-photo]");
          return image && !image.hidden && image.getAttribute("src");
        });
        const clonedWorkCount = Math.max(1, clonedPopulatedCards.length);
        if (clonedWorksControlStatus) clonedWorksControlStatus.textContent = `01 / ${String(clonedWorkCount).padStart(2, "0")}`;
        const clonedWorksIndex = clone.querySelector("#works-exhibit-index");
        const clonedWorksTitle = clone.querySelector("#works-exhibit-title");
        const clonedWorksNote = clone.querySelector("#works-exhibit-note");
        const clonedFirstWork = clonedPopulatedCards[0] || clone.querySelector("#works .work-card");
        if (clonedWorksIndex) clonedWorksIndex.textContent = `01 / ${String(clonedWorkCount).padStart(2, "0")}`;
        if (clonedWorksTitle && clonedFirstWork) clonedWorksTitle.textContent = clonedFirstWork.dataset.exhibitTitle || "作品组图";
        if (clonedWorksNote && clonedFirstWork) clonedWorksNote.textContent = clonedFirstWork.dataset.exhibitNote || "";
        const clonedMobiusCanvas = clone.querySelector("#works-mobius-canvas");
        if (clonedMobiusCanvas) {
          clonedMobiusCanvas.removeAttribute("width");
          clonedMobiusCanvas.removeAttribute("height");
          clonedMobiusCanvas.removeAttribute("style");
        }

        const clonedPlanSection = clone.querySelector("#service-intro");
        clonedPlanSection?.classList.remove("is-fireflies-active");
        if (clonedPlanSection) clonedPlanSection.setAttribute("data-active-plan", "light");
        clone.querySelectorAll(".service-plan").forEach((item) => item.classList.remove("is-expanded"));
        clone.querySelectorAll("[data-plan-choice]").forEach((item) => {
          const selected = item.getAttribute("data-plan-choice") === "light";
          item.setAttribute("aria-selected", String(selected));
          if (selected) item.removeAttribute("tabindex");
          else item.setAttribute("tabindex", "-1");
        });
        clone.querySelectorAll(".plan-details-toggle").forEach((item) => {
          item.setAttribute("aria-expanded", "false");
          item.textContent = item.getAttribute("data-collapsed-label") || "查看包含内容";
        });
        clone.querySelectorAll(".service-rule-toggle").forEach((item) => item.setAttribute("aria-expanded", "false"));
        clone.querySelectorAll(".service-disclosure").forEach((item) => {
          item.removeAttribute("open");
          item.removeAttribute("data-disclosure-expanded");
          item.classList.remove(
            "is-disclosure-animating",
            "is-disclosure-opening",
            "is-disclosure-closing"
          );
          item.style.removeProperty("height");
          item.style.removeProperty("overflow");
          const panel = item.querySelector(".service-disclosure__panel");
          panel?.style.removeProperty("opacity");
          panel?.style.removeProperty("transform");
          panel?.style.removeProperty("transition");
        });
        const clonedFireflyCanvas = clone.querySelector("#plan-fireflies");
        if (clonedFireflyCanvas) {
          clonedFireflyCanvas.removeAttribute("width");
          clonedFireflyCanvas.removeAttribute("height");
        }

        const clonedServiceMotion = clone.querySelector("#service-motion");
        if (clonedServiceMotion) clonedServiceMotion.classList.remove("is-awake", "is-resetting");
        clone.querySelector("#service-motion-plants")?.replaceChildren();
        clone.querySelector("#service-motion-particles")?.replaceChildren();

        const clonedContact = clone.querySelector("#contact");
        if (clonedContact) {
          clonedContact.style.removeProperty("--contact-x");
          clonedContact.style.removeProperty("--contact-y");
        }

        const clonedGalleryPage = clone.querySelector("#gallery-page");
        const clonedGalleryPageTrack = clone.querySelector("#gallery-page-track");
        const clonedGalleryPageCounter = clone.querySelector("#gallery-page-counter");
        const clonedGalleryPageProgress = clone.querySelector("#gallery-page-progress");
        if (clonedGalleryPage) {
          clonedGalleryPage.classList.remove("is-open");
          clonedGalleryPage.hidden = true;
        }
        if (clonedGalleryPageTrack) clonedGalleryPageTrack.replaceChildren();
        if (clonedGalleryPageCounter) clonedGalleryPageCounter.textContent = "01 / 01";
        if (clonedGalleryPageProgress) clonedGalleryPageProgress.style.transform = "scaleX(0)";

        const clonedLightbox = clone.querySelector("#lightbox");
        const clonedLightboxImage = clone.querySelector("#lightbox-image");
        const clonedLightboxCaption = clone.querySelector("#lightbox-caption");
        const clonedLightboxCounter = clone.querySelector("#lightbox-counter");
        if (clonedLightbox) {
          clonedLightbox.classList.remove("is-open");
          clonedLightbox.hidden = true;
        }
        if (clonedLightboxImage) clonedLightboxImage.removeAttribute("src");
        if (clonedLightboxCaption) clonedLightboxCaption.textContent = "";
        if (clonedLightboxCounter) clonedLightboxCounter.textContent = "";

        const clonedGalleryManager = clone.querySelector("#gallery-manager");
        if (clonedGalleryManager) clonedGalleryManager.hidden = true;
        clone.querySelector("#gallery-image-list")?.replaceChildren();
        const clonedSelectionMeta = clone.querySelector("#gallery-selection-meta");
        if (clonedSelectionMeta) clonedSelectionMeta.textContent = "尚未选择";
        const clonedGalleryGroupIndex = clone.querySelector("#gallery-group-index");
        if (clonedGalleryGroupIndex) clonedGalleryGroupIndex.textContent = "01 / 01";

        const clonedMusicToggle = clone.querySelector("#music-toggle");
        const clonedMusicLabel = clone.querySelector("#music-label");
        if (clonedMusicToggle) {
          clonedMusicToggle.classList.remove("is-playing");
          clonedMusicToggle.classList.remove("is-pending");
          clonedMusicToggle.setAttribute("aria-pressed", "false");
        }
        if (clonedMusicLabel) clonedMusicLabel.textContent = "♫ SOUND";

        const clonedToast = clone.querySelector("#edit-toast");
        if (clonedToast) {
          clonedToast.classList.remove("show");
          clonedToast.textContent = "";
        }

        const clonedInput = clone.querySelector("#owner-file-input");
        if (clonedInput) {
          clonedInput.removeAttribute("value");
          clonedInput.setAttribute("multiple", "");
        }
        const clonedAutosaveToggle = clone.querySelector("#autosave-toggle");
        const clonedAutosaveStatus = clone.querySelector("#autosave-status");
        if (clonedAutosaveToggle) {
          clonedAutosaveToggle.checked = false;
          clonedAutosaveToggle.removeAttribute("checked");
          clonedAutosaveToggle.setAttribute("aria-checked", "false");
        }
        if (clonedAutosaveStatus) clonedAutosaveStatus.textContent = "关闭";

        return "<!DOCTYPE html>\n" + clone.outerHTML;
      };

      const downloadHtml = (fileName, successMessage) => {
        const html = buildExportHtml();
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (successMessage) showToast(successMessage);
      };

      const autosaveFileName = () => {
        const date = new Date();
        const twoDigits = (value) => String(value).padStart(2, "0");
        return "LEN-autosave-" +
          date.getFullYear() +
          twoDigits(date.getMonth() + 1) +
          twoDigits(date.getDate()) +
          "-" +
          twoDigits(date.getHours()) +
          twoDigits(date.getMinutes()) +
          ".html";
      };

      function runAutosave() {
        if (!isLocalFile || !autosaveEnabled || !autosaveDirty) return;
        commitGalleryCopy(true);
        try {
          downloadHtml(autosaveFileName(), "");
          autosaveDirty = false;
          updateAutosaveStatus();
          showToast("已自动保存：新版 HTML 已下载");
        } catch {
          showToast("自动保存未完成，请手动导出一次");
        }
      }

      exportButton.addEventListener("click", () => {
        if (!isLocalFile) return;
        commitGalleryCopy(true);
        setEditing(false);
        downloadHtml("index.html", "新版 index.html 已导出");
        autosaveDirty = false;
        updateAutosaveStatus();
      });

      let storedAutosaveEnabled = false;
      try {
        storedAutosaveEnabled = localStorage.getItem(autosaveStorageKey) === "true";
      } catch {}
      setAutosaveEnabled(storedAutosaveEnabled, false);
      autosaveToggle?.addEventListener("change", () => {
        setAutosaveEnabled(autosaveToggle.checked, true);
      });
      window.addEventListener("pagehide", () => {
        if (autosaveTimer) window.clearInterval(autosaveTimer);
      }, { once: true });
    })();

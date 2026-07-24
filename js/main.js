/* ============================================================
   $POTATO — Interactions & animations
   Critical visibility (preloader, reveals, counters, marquee)
   is CSS / IntersectionObserver driven so it works everywhere.
   GSAP layers on pointer + scroll enhancements when available.
   ============================================================ */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noFx = /[?&]nofx\b/.test(location.search); // debug switch: disable pointer/scroll GSAP effects
  const hasGSAP = typeof window.gsap !== "undefined" && !noFx;
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------------------------------------------------------
     Preloader — hidden via CSS transition, never gated on GSAP
  --------------------------------------------------------- */
  const preloader = document.getElementById("preloader");
  const fill = document.getElementById("preloaderFill");
  let revealed = false;

  function revealSite() {
    if (revealed) return;
    revealed = true;
    if (fill) fill.style.width = "100%";
    document.body.classList.add("loaded");
    if (preloader) {
      preloader.classList.add("is-done");
      setTimeout(() => { preloader.style.display = "none"; }, 850);
    }
  }

  // Progress feel
  if (fill) { requestAnimationFrame(() => { fill.style.width = "72%"; }); }

  function startWhenReady() { setTimeout(revealSite, 620); }
  if (document.readyState === "complete") startWhenReady();
  else window.addEventListener("load", startWhenReady);
  // hard safety net
  setTimeout(revealSite, 2600);

  /* ---------------------------------------------------------
     Scroll reveals — IntersectionObserver + CSS classes
  --------------------------------------------------------- */
  function setupReveals() {
    const els = document.querySelectorAll("[data-reveal], [data-reveal-lines]");
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------
     Counters — interval based (independent of rAF throttling)
  --------------------------------------------------------- */
  function animateCount(el) {
    const target = parseFloat(el.getAttribute("data-count"));
    if (reduced) { el.textContent = target; return; }
    const dur = 1500, start = performance.now();
    const tick = () => {
      const p = Math.min((performance.now() - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) setTimeout(tick, 30);
    };
    tick();
  }
  function setupCounters() {
    const nums = document.querySelectorAll("[data-count]");
    if (!("IntersectionObserver" in window)) { nums.forEach(animateCount); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------
     Nav stuck state
  --------------------------------------------------------- */
  function setupNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     Copy contract address
  --------------------------------------------------------- */
  function setupCopy() {
    const chip = document.getElementById("caChip");
    const addr = document.getElementById("caAddr");
    const copyLabel = document.getElementById("caCopy");
    if (!chip || !addr) return;
    chip.addEventListener("click", async () => {
      const text = addr.textContent.trim();
      try { await navigator.clipboard.writeText(text); }
      catch (e) {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (_) {}
        document.body.removeChild(ta);
      }
      chip.classList.add("copied");
      if (copyLabel) copyLabel.textContent = "Copied!";
      setTimeout(() => { chip.classList.remove("copied"); if (copyLabel) copyLabel.textContent = "Copy"; }, 1600);
    });
  }

  /* ---------------------------------------------------------
     GSAP enhancements (optional — pointer + scroll)
  --------------------------------------------------------- */
  function setupCursor() {
    const cursor = document.getElementById("cursor");
    const dot = document.getElementById("cursorDot");
    if (!cursor || !dot || window.matchMedia("(hover: none)").matches) return;

    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, running = false;
    function render() {
      cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      // stop the loop once settled so the page can reach idle (no perpetual rAF)
      if (Math.abs(mx - cx) > 0.4 || Math.abs(my - cy) > 0.4) {
        requestAnimationFrame(render);
      } else { running = false; }
    }
    addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      if (!running) { running = true; requestAnimationFrame(render); }
    });

    document.querySelectorAll("a, button, [data-magnetic]").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });

    if (hasGSAP && !reduced) {
      document.querySelectorAll("[data-magnetic]").forEach((el) => {
        el.addEventListener("mousemove", (e) => {
          const r = el.getBoundingClientRect();
          gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.6, ease: "power3.out" });
        });
        el.addEventListener("mouseleave", () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" }));
      });
    }
  }

  function setupTilt() {
    if (!hasGSAP || reduced) return;
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          rotateX: ((e.clientY - r.top) / r.height - 0.5) * -12,
          rotateY: ((e.clientX - r.left) / r.width - 0.5) * 12,
          transformPerspective: 900, duration: 0.5, ease: "power2.out"
        });
      });
      el.addEventListener("mouseleave", () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "elastic.out(1,0.4)" }));
    });
  }

  function setupParallax() {
    if (!hasGSAP || reduced || !window.ScrollTrigger) return;
    gsap.to(".hero__photo", { y: -50, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
    gsap.to(".float-pup", { y: -80, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
    gsap.fromTo(".story__frame", { rotate: -3 }, { rotate: 3, scrollTrigger: { trigger: ".story", start: "top bottom", end: "bottom top", scrub: 1.2 } });
  }

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  function init() {
    setupNav();
    setupReveals();
    setupCounters();
    setupCopy();
    setupCursor();
    setupTilt();
    setupParallax();
    if (hasGSAP && window.ScrollTrigger) {
      window.addEventListener("load", () => ScrollTrigger.refresh());
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

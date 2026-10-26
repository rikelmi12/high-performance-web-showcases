/* Mundo Náutica — landing page concept
   Native-scroll pass: rolagem nativa, sem interceptação de wheel/trackpad e sem scrub por frame.
   Antes de publicar, configure o WhatsApp comercial abaixo no formato 5562XXXXXXXXX. */
const WHATSAPP_NUMBER = "5562996920122";
const WHATSAPP_MESSAGE = "Olá! Vim pelo site da Mundo Náutica e gostaria de falar com vocês.";

const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer:fine)").matches;
const coarsePointer = window.matchMedia("(pointer:coarse)").matches;
const mobileViewport = window.matchMedia("(max-width: 560px)").matches;

document.documentElement.classList.toggle("is-touch", coarsePointer);
document.documentElement.classList.toggle("is-mobile", mobileViewport);

// Ajuda o navegador a saber que a página usa animações transformadas sem forçar repaint pesado.
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  const year = qs("#year");
  if (year) year.textContent = new Date().getFullYear();

  // ------------------------------------------------------------
  // PRELOADER + HERO — mantém o impacto, mas termina mais rápido.
  // ------------------------------------------------------------
  if (window.gsap && !reduceMotion) {
    const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
    intro
      .to(".preloader__bar i", { x: "0%", duration: mobileViewport ? .34 : .52 })
      .to(".preloader__word", { y: -14, opacity: 0, duration: mobileViewport ? .20 : .28 }, "+=.02")
      .to(".preloader__meta", { opacity: 0, duration: .18 }, "<")
      .to(".preloader", { yPercent: -100, duration: mobileViewport ? .42 : .55, ease: "expo.inOut" })
      .to(".hero__title b", { y: "0%", duration: .78, stagger: .06, ease: "expo.out" }, "-=.16")
      .to(".hero .reveal", { y: 0, opacity: 1, duration: .46, stagger: .05 }, "-=.48")
      .from(".hero__media", { scale: 1.07, duration: 1.05, ease: "expo.out" }, "-=.82");
  } else {
    qs(".preloader")?.remove();
    qsa(".hero__title b").forEach(el => { el.style.transform = "translateY(0)"; });
    qsa(".hero .reveal").forEach(el => el.classList.add("is-visible"));
  }

  // ------------------------------------------------------------
  // NAVEGAÇÃO — 100% scroll nativo.
  // Nenhuma biblioteca intercepta roda do mouse ou trackpad.
  // Isso evita a sensação de scroll preso/garrando.
  // ------------------------------------------------------------
  qsa('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = qs(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  // ------------------------------------------------------------
  // REVEALS — IntersectionObserver em vez de ScrollTrigger/scrub.
  // Isso elimina dezenas de cálculos a cada pixel de scroll.
  // ------------------------------------------------------------
  const revealEls = qsa(".reveal, .split-lines").filter(el => !el.closest(".hero"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(el => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -9% 0px", threshold: .06 });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  // Pausa animações decorativas quando não estão visíveis.
  if ("IntersectionObserver" in window && !reduceMotion) {
    const motionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.target.classList.toggle("is-inview", entry.isIntersecting));
    }, { rootMargin: "120px 0px" });
    qsa(".marquee, .manifesto__stamp").forEach(el => motionObserver.observe(el));
  } else {
    qsa(".marquee, .manifesto__stamp").forEach(el => el.classList.add("is-inview"));
  }

  // A barra de progresso usa CSS Scroll-Driven Animations quando suportado,
  // sem listener de scroll em JavaScript.

  // ------------------------------------------------------------
  // MENU
  // ------------------------------------------------------------
  const menu = qs(".menu");
  const toggle = qs(".menu-toggle");
  const backdrop = qs(".menu__backdrop");
  const panel = qs(".menu__inner");
  let menuOpen = false;

  function setMenu(open) {
    if (!menu || !toggle || !backdrop || !panel) return;
    menuOpen = open;
    toggle.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);

    if (!window.gsap || reduceMotion) {
      panel.style.transform = open ? "translateX(0%)" : "translateX(100%)";
      backdrop.style.opacity = open ? "1" : "0";
      return;
    }

    gsap.killTweensOf([backdrop, panel, ...qsa(".menu__inner > a")]);
    if (open) {
      gsap.timeline()
        .to(backdrop, { opacity: 1, duration: .22 })
        .to(panel, { x: "0%", duration: .48, ease: "expo.out" }, "<")
        .fromTo(qsa(".menu__inner > a"), { x: 22, opacity: 0 }, { x: 0, opacity: 1, duration: .28, stagger: .035 }, "-=.24");
    } else {
      gsap.timeline()
        .to(panel, { x: "100%", duration: .36, ease: "expo.inOut" })
        .to(backdrop, { opacity: 0, duration: .18 }, "-=.16");
    }
  }

  toggle?.addEventListener("click", () => setMenu(!menuOpen));
  backdrop?.addEventListener("click", () => setMenu(false));
  qsa(".menu__inner a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && menuOpen) setMenu(false); });

  // Fecha o menu se o aparelho muda de orientação/largura e restaura o estado limpo.
  window.addEventListener("resize", () => {
    if (menuOpen && window.innerWidth > 900) setMenu(false);
  }, { passive: true });

  // ------------------------------------------------------------
  // CURSOR — transform direto via RAF; não cria tween a cada mousemove.
  // ------------------------------------------------------------
  const cursor = qs(".cursor");
  const cursorText = qs(".cursor span");

  if (cursor && finePointer && !reduceMotion) {
    let mouseX = -100, mouseY = -100;
    let cursorX = -100, cursorY = -100;
    let cursorFrame = null;

    const moveCursor = () => {
      cursorX += (mouseX - cursorX) * .18;
      cursorY += (mouseY - cursorY) * .18;
      cursor.style.setProperty("--cursor-x", `${cursorX}px`);
      cursor.style.setProperty("--cursor-y", `${cursorY}px`);

      if (Math.abs(mouseX - cursorX) > .1 || Math.abs(mouseY - cursorY) > .1) {
        cursorFrame = requestAnimationFrame(moveCursor);
      } else {
        cursorFrame = null;
      }
    };

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.classList.add("is-visible");
      if (!cursorFrame) cursorFrame = requestAnimationFrame(moveCursor);
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
    window.addEventListener("mousedown", () => cursor.classList.add("is-pressed"), { passive: true });
    window.addEventListener("mouseup", () => cursor.classList.remove("is-pressed"), { passive: true });

    qsa("[data-cursor]").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        if (cursorText) cursorText.textContent = el.dataset.cursor || "VER";
        cursor.classList.add("is-active");
      });
      el.addEventListener("mouseleave", () => {
        if (cursorText) cursorText.textContent = "VER";
        cursor.classList.remove("is-active");
      });
    });
  }

  // ------------------------------------------------------------
  // MAGNETIC — só desktop; distância pequena e overwrite para não acumular tween.
  // ------------------------------------------------------------
  if (finePointer && !reduceMotion && window.gsap) {
    qsa(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        gsap.to(el, { x: x * .10, y: y * .10, duration: .18, ease: "power2.out", overwrite: "auto" });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: .35, ease: "power3.out", overwrite: "auto" });
      });
    });
  }

  // ------------------------------------------------------------
  // PREMIUM IN-VIEW — detalhes decorativos acionados uma única vez.
  // Sem scrub e sem listener de scroll.
  // ------------------------------------------------------------
  const premiumStatement = qs(".premium-section");
  if (premiumStatement) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      premiumStatement.classList.add("is-visible-premium");
    } else {
      const premiumObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible-premium");
          observer.unobserve(entry.target);
        });
      }, { threshold: .22 });
      premiumObserver.observe(premiumStatement);
    }
  }

  // ------------------------------------------------------------
  // WHATSAPP
  // ------------------------------------------------------------
  const toast = qs(".toast");
  const wa = qs("#whatsappCta");

  wa?.addEventListener("click", () => {
    if (WHATSAPP_NUMBER) {
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    if (!toast) return;
    if (!window.gsap || reduceMotion) {
      toast.classList.add("is-showing");
      window.setTimeout(() => toast.classList.remove("is-showing"), 2400);
      return;
    }

    gsap.killTweensOf(toast);
    gsap.timeline()
      .to(toast, { y: "0%", duration: .34, ease: "expo.out" })
      .to(toast, { y: "140%", duration: .34, ease: "expo.in" }, "+=2.2");
  });
});

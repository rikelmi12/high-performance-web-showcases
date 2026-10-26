'use strict';

const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reduceMotion = false;
const loader = document.querySelector('.loader');
const loaderBar = document.querySelector('.loader__track i');
const loaderCount = document.querySelector('.loader__count');
const menuBtn = document.querySelector('.menu-btn');
const menuPanel = document.querySelector('.menu-panel');
const cursor = document.querySelector('.cursor');
const cursorText = cursor?.querySelector('span');
const progress = document.querySelector('.scroll-progress');
const year = document.getElementById('year');

if (year) year.textContent = String(new Date().getFullYear());

const loaderLog = document.getElementById('loader-log');

// ===== LOADER HYPERSPACE WARP SPEED TRIGGER =====
const triggerWarpSpeed = () => {
  window.__WARP_ACTIVE = true;
  let elapsed = 0;
  const accelInterval = setInterval(() => {
    elapsed += 0.05;
    window.__WARP_SPEED = 1.2 + Math.min(52, Math.pow(elapsed * 5.2, 2));
    if (elapsed >= 1.4) clearInterval(accelInterval);
  }, 20);
};

function updateLoaderLog(pct) {
  if (!loaderLog) return;
  if (pct < 28) {
    loaderLog.textContent = '> 01_ ALLOCATING HARDWARE GPU BUFFERS...';
  } else if (pct < 58) {
    loaderLog.textContent = '> 02_ COMPILING THREE.JS KINETIC SHADERS...';
  } else if (pct < 88) {
    loaderLog.textContent = '> 03_ SYNCHRONIZING REALTIME TELEMETRY...';
  } else {
    loaderLog.textContent = '> 04_ SYSTEM READY: LAUNCHING WARP DRIVE.';
  }
}

function finishLoader() {
  if (!loader || loader.classList.contains('is-exiting')) return;
  if (triggerWarpSpeed) triggerWarpSpeed();
  document.body.classList.add('is-warping');
  loader.classList.add('is-exiting');

  if (window.sfx) {
    sfx.playTone(240, 0.7, 'sawtooth', 0.03);
    setTimeout(() => sfx.playTone(560, 0.55, 'sine', 0.04), 300);
    setTimeout(() => sfx.playTone(880, 0.45, 'sine', 0.06), 650);
  }

  window.setTimeout(() => {
    document.body.classList.remove('loading');
    document.body.classList.remove('is-warping');
    document.body.classList.add('warp-complete');
    window.dispatchEvent(new CustomEvent('softtec:ready'));
  }, 650);

  window.setTimeout(() => loader.classList.add('is-done'), 1250);
}

// ===== SILENT PRE-WARM & READY GATE FOR ALL DEVICES =====
window.__APP_WARMED = false;
window.__HERO_WARMED = false;

function runWhenReady(fn) {
  const execute = () => requestAnimationFrame(() => requestAnimationFrame(fn));
  if (document.body.classList.contains('loading') || document.body.classList.contains('is-warping')) {
    window.addEventListener('softtec:ready', execute, { once: true });
  } else {
    execute();
  }
}

function isExperienceReady() {
  const domLoaded = document.readyState === 'complete';
  const threeReady = window.__HERO_WARMED || window.__THREE_LOAD_STATE === 'failed';
  return domLoaded && threeReady;
}

if (reduceMotion) {
  if (loaderBar) loaderBar.style.width = '100%';
  if (loaderCount) loaderCount.textContent = '100';
  window.setTimeout(finishLoader, 180);
} else if (loader) {
  let value = 0;
  const started = performance.now();

  const tick = window.setInterval(() => {
    const ready = isExperienceReady();
    const ceiling = ready ? 100 : 90;
    const distance = ceiling - value;
    value += Math.max(1, Math.ceil(distance * (ready ? 0.22 : 0.08)));
    value = Math.min(value, ceiling);
    if (loaderBar) loaderBar.style.width = `${value}%`;
    if (loaderCount) loaderCount.textContent = String(value).padStart(2, '0');
    updateLoaderLog(value);

    const minTimePassed = performance.now() - started > 1200;
    if (ready && value >= 100 && minTimePassed) {
      window.clearInterval(tick);
      window.setTimeout(finishLoader, 100);
    }
  }, 38);

  // Safety fallback for slow networks
  window.setTimeout(() => {
    window.clearInterval(tick);
    if (loaderBar) loaderBar.style.width = '100%';
    if (loaderCount) loaderCount.textContent = '100';
    updateLoaderLog(100);
    finishLoader();
  }, 6000);
}

function closeMenu() {
  if (!menuBtn || !menuPanel) return;
  menuBtn.setAttribute('aria-expanded', 'false');
  menuPanel.setAttribute('aria-hidden', 'true');
  menuPanel.classList.remove('is-open');
  document.body.classList.remove('menu-open');
}

if (menuBtn && menuPanel) {
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    menuPanel.setAttribute('aria-hidden', String(!open));
    menuPanel.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  });
  menuPanel.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}

function splitWords() {
  document.querySelectorAll('.split-words').forEach((el) => {
    if (el.dataset.split === '1') return;
    
    const walk = (node) => {
      if (node.nodeType === 3) { // Text node
        const text = node.nodeValue;
        if (!text.trim()) return;
        const words = text.split(/(\s+)/);
        const fragment = document.createDocumentFragment();
        words.forEach(w => {
          if (!w.trim()) {
            fragment.appendChild(document.createTextNode(w));
          } else {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = w;
            fragment.appendChild(span);
          }
        });
        node.replaceWith(fragment);
      } else if (node.nodeType === 1 && node.nodeName !== 'BR') {
        Array.from(node.childNodes).forEach(walk);
      }
    };
    
    Array.from(el.childNodes).forEach(walk);
    el.dataset.split = '1';
  });
}
splitWords();

function updateProgress() {
  if (!progress) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  progress.style.width = `${pct}%`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// ===== SFX & SOUND SYNTHESIZER (Web Audio API) =====
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  toggle() {
    this.init();
    this.enabled = !this.enabled;
    if (this.enabled) this.playTone(880, 0.08, 'sine', 0.04);
    return this.enabled;
  }
  playTone(freq, duration, type = 'sine', volume = 0.03) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  click() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.035, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {}
  }
  hover() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.012, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.022);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.022);
    } catch (e) {}
  }
}

const sfx = new SoundFX();
window.sfx = sfx;
const soundToggle = document.querySelector('.sound-toggle');
if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    const isPlaying = sfx.toggle();
    soundToggle.classList.toggle('is-playing', isPlaying);
    soundToggle.querySelector('span').textContent = isPlaying ? 'AUDIO ON' : 'AUDIO';
  });
}

// ===== TEXT SCRAMBLE / MATRIX DECODER =====
class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!-_\\/[]{}—=+*^?#________01';
    this.update = this.update.bind(this);
    this.originalText = el.innerText;
  }
  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise((resolve) => this.resolve = resolve);
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 12);
      const end = start + Math.floor(Math.random() * 14);
      this.queue.push({ from, to, start, end });
    }
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }
  update() {
    const fragment = document.createDocumentFragment();
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      if (this.frame >= end) {
        complete++;
        fragment.appendChild(document.createTextNode(to));
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.chars[Math.floor(Math.random() * this.chars.length)];
          this.queue[i].char = char;
        }
        const span = document.createElement('span');
        span.style.color = 'var(--hot)';
        span.style.opacity = '0.85';
        span.textContent = char;
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(from));
      }
    }
    this.el.replaceChildren(fragment);
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  }
}

// Initialize Scramble on section labels, nav links, and services without destroying child spans
document.querySelectorAll('.menu-panel nav a .nav-label, .service-row h3, .section-top span:first-child, .manifesto__label, .tech__label, .about__eyebrow').forEach((el) => {
  const scrambler = new TextScramble(el);
  const rawText = el.innerText;
  const trigger = el.closest('a, .service-row') || el;
  trigger.addEventListener('mouseenter', () => {
    scrambler.setText(rawText);
    sfx.hover();
  });
});

// ===== JELLY ELASTIC CURSOR (PHYSICS VELOCITY DEFORMATION) =====
if (!reduceMotion && cursor && window.matchMedia('(pointer:fine)').matches) {
  let mx = innerWidth / 2, my = innerHeight / 2;
  let cx = mx, cy = my;
  let vx = 0, vy = 0;

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });

  const loop = () => {
    vx = (mx - cx) * 0.18;
    vy = (my - cy) * 0.18;
    cx += vx;
    cy += vy;

    const speed = Math.sqrt(vx * vx + vy * vy);
    const angle = Math.atan2(vy, vx) * (180 / Math.PI);
    
    // Stretch on movement
    const stretch = Math.min(speed * 0.035, 0.48);
    const scaleX = 1 + stretch;
    const scaleY = 1 - stretch * 0.5;

    if (!cursor.classList.contains('is-active')) {
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%) rotate(${angle}deg) scale(${scaleX}, ${scaleY})`;
    } else {
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    }

    requestAnimationFrame(loop);
  };
  loop();

  document.querySelectorAll('[data-cursor], a, button').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const label = el.dataset.cursor || 'OPEN';
      if (cursorText) cursorText.textContent = label;
      cursor.classList.add('is-active');
      sfx.hover();
    });
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
    el.addEventListener('click', () => sfx.click());
  });
}

function fallbackReveal() {
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'none';
      observer.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal-up').forEach((el) => io.observe(el));

  const wordObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.word').forEach((word, i) => {
        window.setTimeout(() => word.classList.add('is-lit'), i * 18);
      });
    });
  }, { threshold: .18 });
  document.querySelectorAll('.split-words').forEach((el) => wordObserver.observe(el));
}

function initMotion() {
  if (reduceMotion) return;

  const hasGSAP = window.gsap && window.ScrollTrigger;
  if (!hasGSAP) {
    document.documentElement.classList.add('motion-fallback');
    fallbackReveal();
    document.querySelectorAll('.hero-line > span').forEach((el) => el.style.transform = 'none');
    return;
  }

  document.documentElement.classList.remove('motion-fallback');

  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        const target = id && id.length > 1 ? document.querySelector(id) : null;
        if (!target) return;
        e.preventDefault();
        closeMenu();
        const topbarOffset = document.querySelector('.topbar')?.offsetHeight || 80;
        lenis.scrollTo(target, { offset: -topbarOffset, duration: 1.15 });
      });
    });
  }

  const intro = gsap.timeline({ paused: true });
  intro
    .fromTo('.topbar', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: 'power4.out' })
    .fromTo('.hero-line > span', 
      { y: '120%', opacity: 0 }, 
      { y: '0%', opacity: 1, duration: 1.25, stagger: 0.08, ease: 'power4.out' }, '-=0.75')
    .to('.hero .reveal-up', { opacity: 1, y: 0, duration: 0.85, stagger: 0.08, ease: 'power3.out' }, '-=0.85')
    .fromTo('#hero-webgl', 
      { scale: 0.72, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 1.4, ease: 'expo.out' }, '-=1.2');

  const playHeroIntro = () => intro.play(0);
  if (document.body.classList.contains('loading')) window.addEventListener('softtec:ready', playHeroIntro, { once: true });
  else playHeroIntro();

  gsap.utils.toArray('.reveal-up:not(.hero .reveal-up)').forEach((el) => {
    gsap.fromTo(el,
      { filter: 'blur(6px)', opacity: 0, y: 30 },
      { filter: 'blur(0px)', opacity: 1, y: 0, duration: 1.2, ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } }
    );
  });

  gsap.utils.toArray('.split-words').forEach((section) => {
    const words = section.querySelectorAll('.word');
    gsap.to(words, {
      opacity: 1, stagger: .025, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top 78%', end: 'bottom 48%', scrub: .55 }
    });
  });

  gsap.to('.hero__title', {
    yPercent: 15, opacity: .28, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.orb-a', {
    xPercent: -30, yPercent: 24, scale: 1.25, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  const projectMotion = gsap.matchMedia();
  projectMotion.add('(min-width: 641px)', () => {
    document.querySelectorAll('.case').forEach((caseEl) => {
      const visual = caseEl.querySelector('.case__visual');
      if (!visual) return;

      const screenOne = visual.querySelector('.screen--one');
      const screenTwo = visual.querySelector('.screen--two');
      const screenFull = visual.querySelector('.screen--full');
      const bgText = visual.querySelector('.case__background span:first-child');

      if (screenOne) {
        gsap.to(screenOne, {
          yPercent: -12, rotation: -2, ease: 'none',
          scrollTrigger: { trigger: visual, start: 'top bottom', end: 'bottom top', scrub: 1 }
        });
      }
      if (screenTwo) {
        gsap.to(screenTwo, {
          yPercent: 12, rotation: 1, ease: 'none',
          scrollTrigger: { trigger: visual, start: 'top bottom', end: 'bottom top', scrub: 1 }
        });
      }
      if (screenFull) {
        gsap.to(screenFull, {
          yPercent: -10, scale: 1.04, ease: 'none',
          scrollTrigger: { trigger: visual, start: 'top bottom', end: 'bottom top', scrub: 1 }
        });
      }
      if (bgText) {
        gsap.to(bgText, {
          xPercent: -14, ease: 'none',
          scrollTrigger: { trigger: visual, start: 'top bottom', end: 'bottom top', scrub: 1 }
        });
      }
    });
  });
}

runWhenReady(initMotion);

if (!reduceMotion) {
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * .09}px, ${y * .09}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

// Awwwards V2 — pointer light, cinematic pinned section and depth interactions
if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
  window.addEventListener('pointermove', (e) => {
    document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
    document.documentElement.style.setProperty('--my', `${e.clientY}px`);
  }, { passive: true });

  document.querySelectorAll('.tilt-zone').forEach((zone) => {
    zone.addEventListener('pointermove', (e) => {
      const r = zone.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      zone.style.setProperty('--gx', `${nx * 100}%`);
      zone.style.setProperty('--gy', `${ny * 100}%`);
      const one = zone.querySelector('.screen--one .screen__tilt');
      const two = zone.querySelector('.screen--two .screen__tilt');
      const full = zone.querySelector('.screen--full .screen__tilt');
      if (one) one.style.translate = `${(nx-.5)*-14}px ${(ny-.5)*-12}px`;
      if (two) two.style.translate = `${(nx-.5)*18}px ${(ny-.5)*15}px`;
      if (full) full.style.transform = `perspective(1000px) rotateX(${(ny-.5)*-7}deg) rotateY(${(nx-.5)*9}deg) translateZ(8px)`;
    });
    zone.addEventListener('pointerleave', () => {
      zone.querySelectorAll('.screen__tilt').forEach(el => {
        el.style.translate = '';
        el.style.transform = '';
      });
    });
  });
}

runWhenReady(() => {
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  gsap.to('.experience__word--a', {
    xPercent:-18, yPercent:-20, rotation:-4, opacity:.22, ease:'none',
    scrollTrigger:{ trigger:'.experience', start:'top top', end:'bottom bottom', scrub:1 }
  });
  gsap.fromTo('.experience__word--b',
    { xPercent:18, scale:.72, opacity:.18 },
    { xPercent:-4, scale:1.08, opacity:1, ease:'none', scrollTrigger:{ trigger:'.experience', start:'top top', end:'70% bottom', scrub:1 } }
  );
  gsap.fromTo('.experience__word--c',
    { xPercent:-24, yPercent:15, opacity:.08 },
    { xPercent:11, yPercent:5, opacity:1, ease:'none', scrollTrigger:{ trigger:'.experience', start:'25% top', end:'bottom bottom', scrub:1 } }
  );
  gsap.to('.experience__sphere', {
    scale:1.7, rotation:110, yPercent:-8, filter:'saturate(1.35) blur(1px)', ease:'none',
    scrollTrigger:{ trigger:'.experience', start:'top top', end:'bottom bottom', scrub:1.2 }
  });
  gsap.to('.experience__stage', {
    rotateX:4, rotateY:-5, ease:'none',
    scrollTrigger:{ trigger:'.experience', start:'top top', end:'bottom bottom', scrub:1 }
  });
  gsap.to('.statement__rail', {
    xPercent:-22, ease:'none',
    scrollTrigger:{ trigger:'.statement', start:'top bottom', end:'bottom top', scrub:1 }
  });
  gsap.from('.statement__title span', {
    yPercent:115, opacity:0, duration:1.15, stagger:.08, ease:'power4.out',
    scrollTrigger:{ trigger:'.statement__title', start:'top 82%', once:true }
  });
  gsap.to('.case__visual', {
    borderRadius:'0px', scale:.985, ease:'none',
    scrollTrigger:{ trigger:'.case__visual', start:'top 90%', end:'center center', scrub:.8 }
  });
}, { once:true });

// ===== AWWWARDS V3 / MAX MODE =====
// Helper to ensure Three.js is ready before constructing WebGL scenes
function whenThreeReady(fn) {
  let intervalId = 0;
  let checks = 0;
  let settled = false;

  const cleanup = () => {
    if (intervalId) clearInterval(intervalId);
    window.removeEventListener('softtec:three-ready', attempt);
  };
  const attempt = () => {
    if (settled || !window.THREE) return false;
    settled = true;
    cleanup();
    try {
      fn();
    } catch (error) {
      console.error('[SoftTec] Falha ao iniciar uma cena 3D.', error);
      window.__THREE_LOAD_STATE = 'failed';
      window.__HERO_WARMED = true;
      document.documentElement.classList.add('no-three');
    }
    return true;
  };

  window.addEventListener('softtec:three-ready', attempt);
  if (attempt()) return;

  intervalId = setInterval(() => {
    checks += 1;
    if (attempt()) return;
    if (window.__THREE_LOAD_STATE === 'failed' || checks > 250) {
      settled = true;
      document.documentElement.classList.add('no-three');
      cleanup();
    }
  }, 40);
}

// ===== HERO 3D EXPERIMENTAL MASTERPIECE (Three.js) =====
whenThreeReady(() => {
  const canvas = document.getElementById('hero-webgl');
  const heroSection = document.querySelector('.hero');
  if (!canvas || reduceMotion) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7.8);

  const heroGroup = new THREE.Group();
  scene.add(heroGroup);

  // Procedural Ultra-Crisp Studio Chrome MatCap Texture
  const matcapCanvas = document.createElement('canvas');
  matcapCanvas.width = 512;
  matcapCanvas.height = 512;
  const mctx = matcapCanvas.getContext('2d');

  const bgGrad = mctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  bgGrad.addColorStop(0, '#ffffff');
  bgGrad.addColorStop(0.22, '#e2e7f2');
  bgGrad.addColorStop(0.48, '#323744');
  bgGrad.addColorStop(0.74, '#12141a');
  bgGrad.addColorStop(0.9, '#ff5b45');
  bgGrad.addColorStop(1, '#08090c');
  mctx.fillStyle = bgGrad;
  mctx.fillRect(0, 0, 512, 512);

  // Key Studio Softbox Reflection
  const topLight = mctx.createLinearGradient(0, 30, 0, 240);
  topLight.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  topLight.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  mctx.fillStyle = topLight;
  mctx.beginPath();
  mctx.ellipse(256, 120, 195, 75, 0, 0, Math.PI * 2);
  mctx.fill();

  // Bottom Hot Rim Reflection
  const rimLight = mctx.createRadialGradient(410, 410, 20, 410, 410, 160);
  rimLight.addColorStop(0, 'rgba(255, 91, 69, 0.95)');
  rimLight.addColorStop(0.6, 'rgba(255, 91, 69, 0.4)');
  rimLight.addColorStop(1, 'rgba(255, 91, 69, 0.0)');
  mctx.fillStyle = rimLight;
  mctx.beginPath();
  mctx.arc(410, 410, 140, 0, Math.PI * 2);
  mctx.fill();

  const chromeMatcap = new THREE.CanvasTexture(matcapCanvas);
  const isMobile = window.innerWidth <= 768;

  // 1. High-Density Chrome Helix Torus Knot
  const knotGeo = new THREE.TorusKnotGeometry(1.42, 0.42, isMobile ? 140 : 280, isMobile ? 28 : 52, 2, 3);
  const chromeMat = new THREE.MeshMatcapMaterial({
    matcap: chromeMatcap,
    side: THREE.DoubleSide
  });
  const knotMesh = new THREE.Mesh(knotGeo, chromeMat);
  heroGroup.add(knotMesh);

  // 2. Inner Glowing Energy Core
  const coreGeo = new THREE.IcosahedronGeometry(0.85, 3);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xff5b45,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  heroGroup.add(coreMesh);

  // 3. Technical Gyro Ring Structure
  const ringGeoA = new THREE.TorusGeometry(2.65, 0.016, 16, 160);
  const ringMatA = new THREE.MeshMatcapMaterial({
    matcap: chromeMatcap,
    color: 0xff8d7a
  });
  const ringA = new THREE.Mesh(ringGeoA, ringMatA);
  ringA.rotation.x = Math.PI * 0.35;
  heroGroup.add(ringA);

  const ringGeoB = new THREE.TorusGeometry(3.05, 0.012, 16, 180);
  const ringMatB = new THREE.MeshBasicMaterial({
    color: 0xff5b45,
    wireframe: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  const ringB = new THREE.Mesh(ringGeoB, ringMatB);
  ringB.rotation.y = Math.PI * 0.42;
  heroGroup.add(ringB);

  // 4. Ambient Energy Particle Halo
  const particleCount = isMobile ? 80 : 220;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const radius = 2.2 + Math.random() * 3.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    particlePositions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xff5b45,
    size: 0.038,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  heroGroup.add(particles);

  window.addEventListener('softtec:color-change', (e) => {
    try {
      const col = new THREE.Color(e.detail.color);
      if (coreMat) coreMat.color.copy(col);
      if (ringMatB) ringMatB.color.copy(col);
      if (particleMat) particleMat.color.copy(col);
    } catch(err){}
  });

  let targetMouseX = 0, targetMouseY = 0;
  let currentMouseX = 0, currentMouseY = 0;
  let pulse = 0;

  if (heroSection && window.matchMedia('(pointer:fine)').matches) {
    heroSection.addEventListener('pointermove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      targetMouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      targetMouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }, { passive: true });

    heroSection.addEventListener('pointerdown', () => {
      pulse = 1.4;
      if (window.sfx) sfx.click();
    });
  }

  function onResize() {
    const w = heroSection ? heroSection.offsetWidth : (canvas.clientWidth || window.innerWidth);
    const h = heroSection ? heroSection.offsetHeight : (canvas.clientHeight || window.innerHeight);
    const width = Math.max(w, 320);
    const height = Math.max(h, 320);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const mobile = window.innerWidth <= 800;
    heroGroup.position.set(mobile ? 0 : 1.35, mobile ? 0.9 : 0, mobile ? -1.1 : 0);
    heroGroup.scale.setScalar(mobile ? 0.48 : 1.0);
  }

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('softtec:ready', () => { setTimeout(onResize, 50); setTimeout(onResize, 400); });
  window.addEventListener('load', onResize, { passive: true });
  if (window.ResizeObserver && heroSection) {
    new ResizeObserver(onResize).observe(heroSection);
  }
  onResize();

  let heroVisible = true;
  let heroFrame = 0;
  const startHeroFrame = () => {
    if (!heroFrame && heroVisible && !document.hidden) heroFrame = requestAnimationFrame(animate);
  };
  if (window.IntersectionObserver && heroSection) {
    const heroVisibilityObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible) {
        onResize();
        startHeroFrame();
      }
    }, { rootMargin: '120px 0px' });
    heroVisibilityObserver.observe(heroSection);
  }
  document.addEventListener('visibilitychange', startHeroFrame, { passive: true });

  const clock = new THREE.Clock();

  function animate() {
    heroFrame = 0;
    if (!heroVisible || document.hidden) return;

    const elapsedTime = clock.getElapsedTime();

    currentMouseX += (targetMouseX - currentMouseX) * 0.055;
    currentMouseY += (targetMouseY - currentMouseY) * 0.055;

    pulse *= 0.94;
    if (pulse < 0.001) pulse = 0;

    const scrollY = window.scrollY || 0;
    const heroH = heroSection ? heroSection.offsetHeight : window.innerHeight;
    const scrollProgress = Math.min(1, Math.max(0, scrollY / Math.max(1, heroH)));

    const mobile = window.innerWidth <= 800;
    knotMesh.rotation.y = elapsedTime * 0.35 + currentMouseX * 0.5;
    knotMesh.rotation.x = elapsedTime * 0.22 + currentMouseY * 0.4;
    knotMesh.scale.setScalar(1 + pulse * 0.25);

    coreMesh.rotation.y = -elapsedTime * 0.5;
    coreMesh.scale.setScalar(1 + Math.sin(elapsedTime * 3.0) * 0.15 + pulse * 0.4);

    ringA.rotation.z = elapsedTime * 0.2 + scrollProgress * 1.5;
    ringA.rotation.x = Math.PI * 0.35 + currentMouseY * 0.4;

    ringB.rotation.z = -elapsedTime * 0.15 + scrollProgress * 2.0;
    ringB.rotation.y = Math.PI * 0.42 + currentMouseX * 0.4;

    particles.rotation.y = elapsedTime * 0.04;
    particles.rotation.x = -elapsedTime * 0.025;

    heroGroup.position.y = (mobile ? 0.9 : 0) - scrollProgress * 1.4;
    heroGroup.position.z = (mobile ? -1.1 : 0) - scrollProgress * 2.0;
    heroGroup.rotation.y = currentMouseX * 0.35 + scrollProgress * 0.7;
    heroGroup.rotation.x = currentMouseY * 0.25;

    try {
      renderer.render(scene, camera);
    } catch (error) {
      console.error('[SoftTec] A renderização 3D do hero foi interrompida.', error);
      document.documentElement.classList.add('no-three');
      return;
    }
    heroFrame = requestAnimationFrame(animate);
  }

  // Silent background pre-warm
  try {
    renderer.render(scene, camera);
    window.__HERO_WARMED = true;
  } catch (e) {
    window.__HERO_WARMED = true;
  }
  startHeroFrame();
});

(() => {
  if (reduceMotion) return;
  const darkSections = document.querySelectorAll('.experience,.portal,.work,.tech');
  const cinemaObserver = new IntersectionObserver((entries) => {
    const on = entries.some(e => e.isIntersecting && e.intersectionRatio > .08);
    if (on) document.body.classList.add('cinema');
    else {
      const any = [...darkSections].some(el => {
        const r=el.getBoundingClientRect(); return r.top < innerHeight*.8 && r.bottom > innerHeight*.2;
      });
      document.body.classList.toggle('cinema', any);
    }
  }, { threshold:[.08,.2] });
  darkSections.forEach(s => cinemaObserver.observe(s));
})();

runWhenReady(() => {
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  const portal = document.querySelector('.portal');
  if (portal) {
    const rings = gsap.utils.toArray('.portal__rings i');
    rings.forEach((ring, i) => {
      gsap.fromTo(ring,
        { scale: .2 + i*.04, opacity: .08 },
        { scale: 1.9 + i*.18, opacity: i===4 ? .7 : .24, rotation: (i%2?1:-1)*(70+i*20), ease:'none',
          scrollTrigger:{ trigger:portal, start:'top top', end:'bottom bottom', scrub:1.15 } }
      );
    });
    gsap.fromTo('.portal__core',
      { scale:.25, opacity:.25 },
      { scale:3.2, opacity:1, ease:'none', scrollTrigger:{trigger:portal,start:'top top',end:'70% bottom',scrub:1} }
    );
    gsap.fromTo('.portal__copy h2 span',
      { yPercent: i => (i-1)*35, opacity:.18 },
      { yPercent: i => (1-i)*8, opacity:1, stagger:.02, ease:'none', scrollTrigger:{trigger:portal,start:'top top',end:'75% bottom',scrub:1} }
    );
    gsap.to('.portal__copy', {
      scale:1.08, ease:'none',
      scrollTrigger:{trigger:portal,start:'25% top',end:'bottom bottom',scrub:1}
    });
    ScrollTrigger.create({
      trigger: portal, start:'top top', end:'bottom bottom', scrub:true,
      onUpdate:self => portal.style.setProperty('--portal-progress', `${Math.round(self.progress*100)}%`)
    });
  }

  const flash = document.querySelector('.section-flash');
  if (flash) {
    gsap.timeline({
      scrollTrigger:{ trigger:'.work', start:'top 96%', toggleActions:'play none none reverse' }
    }).to(flash,{scaleY:1,duration:.32,ease:'power3.in',transformOrigin:'bottom'})
      .to(flash,{scaleY:0,duration:.5,ease:'power3.out',transformOrigin:'top'});
  }

  const titleLines = gsap.utils.toArray('.hero-line > span');
  if (window.matchMedia('(pointer:fine)').matches) {
    const hero=document.querySelector('.hero');
    hero?.addEventListener('pointermove', (e) => {
      const nx=(e.clientX/innerWidth-.5), ny=(e.clientY/innerHeight-.5);
      titleLines.forEach((line,i)=>{
        gsap.to(line,{ x:nx*(i%2?18:-12), rotateX:-ny*2.2, rotateY:nx*1.6, duration:.7, overwrite:'auto', ease:'power2.out' });
      });
    },{passive:true});
    hero?.addEventListener('pointerleave',()=>titleLines.forEach(line=>gsap.to(line,{x:0,rotateX:0,rotateY:0,duration:.8,ease:'power3.out'})));
  }

  gsap.utils.toArray('.service-row').forEach((row,i)=>{
    gsap.from(row.querySelectorAll('span,h3,p,b'),{
      x:(j)=>j%2?28:-18, opacity:0, stagger:.035, duration:.75, ease:'power3.out',
      scrollTrigger:{trigger:row,start:'top 88%',once:true}
    });
  });
}, { once:true });

// ===== SOFTTEC VOID / V4 — immersive signal layer =====
(() => {
  if (reduceMotion) return;
  const fine = window.matchMedia('(pointer:fine)').matches;
  const trail = document.querySelector('.mouse-trail');
  if (fine && trail) {
    document.body.classList.add('has-pointer');
    let tx = innerWidth/2, ty = innerHeight/2, x=tx, y=ty;
    addEventListener('pointermove', e => { tx=e.clientX; ty=e.clientY; }, {passive:true});
    const follow=()=>{ x+=(tx-x)*.075; y+=(ty-y)*.075; trail.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`; requestAnimationFrame(follow); };
    requestAnimationFrame(follow);
  }

  const canvas = document.getElementById('signal-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha:true });
  const signal = document.querySelector('.signal');
  if (!ctx || !signal) return;
  let visible=!window.IntersectionObserver, mx=.5, my=.5, t=0, particles=[], signalFrame=0;
  const makeParticles=()=>{
    const n = innerWidth < 700 ? 90 : 180;
    particles = Array.from({length:n},(_,i)=>({
      a: Math.random()*Math.PI*2,
      r: .08+Math.random()*.88,
      z: Math.random(),
      s: .18+Math.random()*.8,
      o: .12+Math.random()*.6
    }));
  };
  makeParticles();
  addEventListener('resize', makeParticles, {passive:true});
  if (fine) signal.addEventListener('pointermove',e=>{ const r=signal.getBoundingClientRect(); mx=(e.clientX-r.left)/r.width; my=Math.min(1,Math.max(0,e.clientY/innerHeight)); },{passive:true});
  const startSignalFrame=()=>{if(!signalFrame&&visible&&!document.hidden)signalFrame=requestAnimationFrame(draw)};
  if(window.IntersectionObserver){
    new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)startSignalFrame()},{threshold:0}).observe(signal);
  }
  document.addEventListener('visibilitychange',startSignalFrame,{passive:true});
  let cachedW = 0, cachedH = 0;
  function resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const r = canvas.getBoundingClientRect();
    cachedW = canvas.width = Math.max(320, Math.round((r.width || window.innerWidth) * dpr));
    cachedH = canvas.height = Math.max(320, Math.round((r.height || window.innerHeight) * dpr));
    return { w: cachedW, h: cachedH, dpr };
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  function draw(){
    signalFrame=0; if(!visible||document.hidden) return; t+=.006;
    const w = cachedW || canvas.width || 320, h = cachedH || canvas.height || 320;
    ctx.clearRect(0,0,w,h); const cx=w*(.5+(mx-.5)*.08), cy=h*(.5+(my-.5)*.06); const min=Math.min(w,h);
    ctx.globalCompositeOperation='lighter';
    for(const p of particles){
      p.z -= .0022*p.s; if(p.z<=.02){p.z=1;p.a=Math.random()*Math.PI*2;p.r=.08+Math.random()*.92;}
      const depth=1/(.15+p.z); const swirl=p.a+t*(1.4-p.z)*p.s;
      const rad=p.r*min*.36*depth; const x=cx+Math.cos(swirl)*rad, y=cy+Math.sin(swirl)*rad*.52;
      const size=Math.max(.5,(1-p.z)*2.3+ p.s*.5)*Math.min(devicePixelRatio||1,1.5);
      const alpha=(1-p.z)*p.o*.55;
      ctx.fillStyle=`rgba(255,${65+Math.round(p.s*55)},${42+Math.round(p.s*28)},${alpha})`;
      ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();
    }
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,min*.28);g.addColorStop(0,'rgba(255,82,52,.16)');g.addColorStop(.25,'rgba(255,64,42,.055)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='source-over';
    signalFrame=requestAnimationFrame(draw);
  }
  startSignalFrame();
})();

runWhenReady(() => {
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const signal=document.querySelector('.signal');
  if(signal){
    const lines=gsap.utils.toArray('.signal__copy h2 span');
    gsap.fromTo(lines,
      {opacity:.05, yPercent:(i)=>i===1?35:-25, scale:(i)=>i===1?.8:1.12},
      {opacity:1,yPercent:0,scale:1,ease:'none',stagger:.04,scrollTrigger:{trigger:signal,start:'top top',end:'55% bottom',scrub:1.15}}
    );
    gsap.to('.signal__crosshair',{scale:1.75,rotation:95,ease:'none',scrollTrigger:{trigger:signal,start:'top top',end:'bottom bottom',scrub:1.2}});
    gsap.to('.signal__grid',{yPercent:-18,scale:1.18,ease:'none',scrollTrigger:{trigger:signal,start:'top top',end:'bottom bottom',scrub:1}});
    gsap.fromTo('.signal__copy p',{opacity:0,y:40},{opacity:1,y:0,ease:'none',scrollTrigger:{trigger:signal,start:'38% top',end:'63% top',scrub:.8}});
    gsap.to('.signal__telemetry',{opacity:.2,y:18,ease:'none',scrollTrigger:{trigger:signal,start:'55% top',end:'bottom bottom',scrub:1}});
  }

  const impact=document.querySelector('.impact');
  if(impact){
    gsap.to('.impact__orb',{yPercent:-28,scale:1.18,rotation:26,ease:'none',scrollTrigger:{trigger:impact,start:'top bottom',end:'bottom top',scrub:1.1}});
    gsap.utils.toArray('.impact__title span').forEach((el,i)=>{
      gsap.fromTo(el,{xPercent:i%2?-9:8,opacity:.2},{xPercent:0,opacity:1,ease:'none',scrollTrigger:{trigger:impact,start:'top 80%',end:'55% 45%',scrub:.9}})
    });
    gsap.from('.impact__cards article',{y:80,opacity:0,stagger:.12,duration:1,ease:'power4.out',scrollTrigger:{trigger:'.impact__cards',start:'top 83%',once:true}});
  }

  // stronger section cuts: top bar inverts according to section luminosity
  const dark='.signal,.experience,.portal,.work,.tech,.statement,.contact';
  gsap.utils.toArray(dark).forEach(section=>{
    ScrollTrigger.create({trigger:section,start:'top 8%',end:'bottom 8%',onEnter:()=>document.body.classList.add('nav-dark'),onEnterBack:()=>document.body.classList.add('nav-dark'),onLeave:()=>document.body.classList.remove('nav-dark'),onLeaveBack:()=>document.body.classList.remove('nav-dark')});
  });
}, {once:true});

// ===== SOFTTEC V5 / FINAL BOSS =====
(() => {
  const caseVisuals = document.querySelectorAll('.case__visual'), displacement = document.getElementById('case-displace'), turbulence = document.getElementById('case-noise');
  if (caseVisuals.length && displacement && !reduceMotion) {
    let target = 0, current = 0, seed = 7, raf = 0;
    const tick = () => {
      current += (target - current) * .12;
      displacement.setAttribute('scale', current.toFixed(2));
      if (current > .25) {
        seed += .055;
        turbulence?.setAttribute('seed', String(Math.floor(seed) % 97));
      }
      if (Math.abs(target - current) > .05 || target > 0) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const setTarget = v => { target = v; if (!raf) raf = requestAnimationFrame(tick); };
    caseVisuals.forEach((cv) => {
      cv.addEventListener('pointerenter', () => { cv.classList.add('is-warping'); setTarget(13); });
      cv.addEventListener('pointerleave', () => { cv.classList.remove('is-warping'); setTarget(0); });
      if (window.matchMedia('(pointer:fine)').matches) {
        cv.addEventListener('pointermove', e => {
          const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
          cv.style.setProperty('--warp-x', `${x}%`);
          cv.style.setProperty('--warp-y', `${y}%`);
          setTarget(9 + Math.abs(x - 50) * .10 + Math.abs(y - 50) * .06);
        }, { passive: true });
      }
    });
  }
})();

  // ===== 3D SINGULARITY CONSTRUCT (EVENT HORIZON & WARP TUNNEL) =====
  const singularitySection = document.getElementById('singularity');
  whenThreeReady(() => {
    const section = singularitySection;
    const canvas = section?.querySelector('.singularity__canvas');
    if (!canvas || !section || reduceMotion) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    const singularityGroup = new THREE.Group();
    scene.add(singularityGroup);

    // 1. Black Hole Deep Void Core (The Absolute Event Horizon)
    const holeGeo = new THREE.SphereGeometry(1.28, 64, 64);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const holeMesh = new THREE.Mesh(holeGeo, holeMat);
    singularityGroup.add(holeMesh);

    // 2. Gravitational Photon Ring (The Fiery Einstein Glow)
    const photonGeo = new THREE.TorusGeometry(1.32, 0.05, 32, 160);
    const photonMat = new THREE.MeshBasicMaterial({
      color: 0xff8d74,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const photonRing = new THREE.Mesh(photonGeo, photonMat);
    singularityGroup.add(photonRing);

    // 3. Volumetric Swirling Accretion Disk (1400 Orbital Plasma Particles)
    const diskCount = window.innerWidth < 700 ? 500 : 1200;
    const diskPositions = new Float32Array(diskCount * 3);
    const diskColors = new Float32Array(diskCount * 3);
    const diskAngles = new Float32Array(diskCount);
    const diskRadii = new Float32Array(diskCount);
    const diskSpeeds = new Float32Array(diskCount);

    const colorInner = new THREE.Color(0xffffff);
    const colorMid = new THREE.Color(0xff5b45);
    const colorOuter = new THREE.Color(0xffa285);

    for (let i = 0; i < diskCount; i++) {
      const r = 1.38 + Math.pow(Math.random(), 1.8) * 3.8;
      const a = Math.random() * Math.PI * 2;
      diskRadii[i] = r;
      diskAngles[i] = a;
      diskSpeeds[i] = (0.015 + Math.random() * 0.02) * Math.pow(1.8 / r, 1.5);

      const x = Math.cos(a) * r;
      const y = (Math.random() - 0.5) * 0.08 * (r - 1.2);
      const z = Math.sin(a) * r;

      diskPositions[i * 3] = x;
      diskPositions[i * 3 + 1] = y;
      diskPositions[i * 3 + 2] = z;

      const t = (r - 1.38) / 3.8;
      const c = new THREE.Color();
      if (t < 0.25) c.lerpColors(colorInner, colorMid, t / 0.25);
      else c.lerpColors(colorMid, colorOuter, (t - 0.25) / 0.75);

      diskColors[i * 3] = c.r;
      diskColors[i * 3 + 1] = c.g;
      diskColors[i * 3 + 2] = c.b;
    }

    const diskGeo = new THREE.BufferGeometry();
    diskGeo.setAttribute('position', new THREE.Float32BufferAttribute(diskPositions, 3));
    diskGeo.setAttribute('color', new THREE.Float32BufferAttribute(diskColors, 3));

    const diskMat = new THREE.PointsMaterial({
      size: 0.048,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const disk = new THREE.Points(diskGeo, diskMat);
    singularityGroup.add(disk);

    // 4. Relativistic Jet Ring
    const jetGeo = new THREE.TorusGeometry(3.6, 0.012, 16, 180);
    const jetMat = new THREE.MeshBasicMaterial({
      color: 0xff5b45,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const jetRing = new THREE.Mesh(jetGeo, jetMat);
    jetRing.rotation.x = Math.PI * 0.46;
    singularityGroup.add(jetRing);

    // 5. Starfield Warp Stream
    const starCount = window.innerWidth < 700 ? 120 : 320;
    const starPositions = new Float32Array(starCount * 3);
    const starSpeeds = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const radius = 3.5 + Math.random() * 8.0;
      const theta = Math.random() * Math.PI * 2;
      starPositions[i * 3] = Math.cos(theta) * radius;
      starPositions[i * 3 + 1] = Math.sin(theta) * radius;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 18;
      starSpeeds[i] = 0.025 + Math.random() * 0.045;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xff8d74,
      size: 0.042,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    let mx = 0, my = 0, tx = 0, ty = 0, progress = 0, pulse = 0;
    if (window.matchMedia('(pointer:fine)').matches) {
      section.addEventListener('pointermove', e => {
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
      section.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
      section.addEventListener('pointerdown', () => { pulse = 1.4; if (window.sfx) sfx.click(); });
    }

    const canvasHost = canvas.parentElement || section;
    const resize = () => {
      const bounds = canvasHost.getBoundingClientRect();
      const width = Math.max(Math.round(bounds.width || canvas.clientWidth || window.innerWidth), 320);
      const height = Math.max(Math.round(bounds.height || canvas.clientHeight || window.innerHeight), 320);

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('softtec:ready', () => { setTimeout(resize, 60); setTimeout(resize, 400); });
    window.addEventListener('load', resize, { passive: true });
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvasHost);
    }
    resize();

    const progressBar = section.querySelector('.singularity__progress em');
    const updateProgress = () => {
      const r = section.getBoundingClientRect(), span = Math.max(1, section.offsetHeight - window.innerHeight);
      progress = Math.min(1, Math.max(0, -r.top / span));
      if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    let isVisible = true;
    let singularityFrame = 0;
    const startSingularityFrame = () => {
      if (!singularityFrame && isVisible && !document.hidden) singularityFrame = requestAnimationFrame(frame);
    };
    if (window.IntersectionObserver) {
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          resize();
          updateProgress();
          startSingularityFrame();
        }
      }, { rootMargin: '160px 0px' });
      visibilityObserver.observe(section);
    }
    document.addEventListener('visibilitychange', startSingularityFrame, { passive: true });

    const clock = new THREE.Clock();
    const frame = () => {
      singularityFrame = 0;
      if (!isVisible || document.hidden) return;
      const t = clock.getElapsedTime();

      mx += (tx - mx) * 0.045;
      my += (ty - my) * 0.045;
      pulse *= 0.94;

      singularityGroup.rotation.y = t * 0.14 + progress * Math.PI * 1.8 + mx * 0.35;
      singularityGroup.rotation.x = 0.12 + Math.sin(t * 0.2) * 0.08 + my * 0.25;

      const scale = 0.9 + Math.sin(progress * Math.PI) * 0.42 + progress * 0.15 + pulse * 0.25;
      singularityGroup.scale.setScalar(scale);
      singularityGroup.position.z = -progress * 1.5;

      // Keplerian swirling accretion disk animation
      const diskPosArr = diskGeo.attributes.position.array;
      for (let i = 0; i < diskCount; i++) {
        diskAngles[i] += diskSpeeds[i] * (1.0 + progress * 2.0);
        const a = diskAngles[i];
        const r = diskRadii[i];
        diskPosArr[i * 3] = Math.cos(a) * r;
        diskPosArr[i * 3 + 2] = Math.sin(a) * r;
      }
      diskGeo.attributes.position.needsUpdate = true;

      photonRing.rotation.z = t * 0.6;
      photonRing.scale.setScalar(1 + Math.sin(t * 4.0) * 0.03 + pulse * 0.15);

      jetRing.rotation.z = -t * 0.35 + progress * 2.8;

      // Hyperspace stars flow
      const posArr = starGeo.attributes.position.array;
      const warpSpeed = 0.03 + progress * 0.45;
      for (let i = 0; i < starCount; i++) {
        posArr[i * 3 + 2] += starSpeeds[i] + warpSpeed;
        if (posArr[i * 3 + 2] > 9) {
          posArr[i * 3 + 2] = -9;
        }
      }
      starGeo.attributes.position.needsUpdate = true;
      stars.rotation.z = -t * 0.02 + progress * 0.5;

      camera.position.x = mx * 0.25;
      camera.position.y = -my * 0.2;
      camera.lookAt(0, 0, 0);

      try {
        renderer.render(scene, camera);
      } catch (error) {
        console.error('[SoftTec] A renderização 3D da singularidade foi interrompida.', error);
        document.documentElement.classList.add('no-three');
        return;
      }
      singularityFrame = requestAnimationFrame(frame);
    };
    startSingularityFrame();
  });

  const initSingularityMotion = () => {
    if (!singularitySection || reduceMotion || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const lineFrom = { opacity: 0.25, scale: 0.94 };
    const lineTo = { opacity: 1, scale: 1, stagger: 0.035, ease: 'none' };
    if (window.matchMedia('(min-width: 701px)').matches) {
      lineFrom.filter = 'blur(6px)';
      lineTo.filter = 'blur(0px)';
    }

    gsap.fromTo('.singularity__copy h2 span',
      lineFrom,
      { ...lineTo,
        scrollTrigger: { trigger: singularitySection, start: 'top 70%', end: '55% bottom', scrub: 1 } }
    );
    gsap.to('.singularity__copy', {
      scale: 1.08, yPercent: -4, ease: 'none',
      scrollTrigger: { trigger: singularitySection, start: '25% top', end: 'bottom bottom', scrub: 1 }
    });
    gsap.to('.singularity__orbit', {
      scale: 1.42, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: singularitySection, start: 'top top', end: 'bottom bottom', scrub: 1 }
    });
    gsap.fromTo('.singularity__copy p',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: singularitySection, start: '38% top', end: '64% top', scrub: 1 } }
    );

    requestAnimationFrame(() => ScrollTrigger.refresh());
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  };

  runWhenReady(initSingularityMotion);
  window.addEventListener('softtec:ready', () => window.ScrollTrigger?.refresh(), { once: true });


/* Mobile project showcase entrance */
(() => {
  const mq = window.matchMedia('(max-width: 640px)');
  if (!mq.matches || typeof gsap === 'undefined') return;
  const cards = document.querySelectorAll('.project-screen, .case-screen, .screen');
  cards.forEach((card, i) => {
    gsap.fromTo(card,
      { opacity: 0, y: 44, scale: .97 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: .85,
        ease: 'power3.out',
        scrollTrigger: typeof ScrollTrigger !== 'undefined' ? {
          trigger: card,
          start: 'top 86%',
          once: true
        } : undefined
      }
    );
  });
})();

// About 2.5D portrait — layered parallax + subtle scroll depth.
(() => {
  const art = document.querySelector('[data-about-art]');
  if (!art) return;
  const fine = window.matchMedia('(pointer:fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const render = () => {
    cx += (tx - cx) * .085;
    cy += (ty - cy) * .085;
    art.style.setProperty('--px', `${(cx * 18).toFixed(2)}px`);
    art.style.setProperty('--py', `${(cy * 15).toFixed(2)}px`);
    art.style.setProperty('--ry', `${(cx * 2.8).toFixed(2)}deg`);
    art.style.setProperty('--rx', `${(-cy * 2.2).toFixed(2)}deg`);
    if (Math.abs(tx-cx)>.002 || Math.abs(ty-cy)>.002) raf=requestAnimationFrame(render); else raf=0;
  };
  const kick = () => { if (!raf) raf=requestAnimationFrame(render); };
  if (fine && !reduced) {
    art.addEventListener('pointermove', e => {
      const r=art.getBoundingClientRect();
      tx=((e.clientX-r.left)/r.width-.5)*2;
      ty=((e.clientY-r.top)/r.height-.5)*2;
      kick();
    }, {passive:true});
    art.addEventListener('pointerleave', () => { tx=0; ty=0; kick(); });
  }
  if (window.gsap && window.ScrollTrigger && !reduced) {
    // Animate custom properties so scroll depth and pointer tilt never overwrite the same transform.
    if (window.matchMedia('(min-width:641px)').matches) {
      gsap.fromTo(art,
        { '--person-scroll-y':'18px' },
        { '--person-scroll-y':'-20px', ease:'none', scrollTrigger:{trigger:art,start:'top bottom',end:'bottom top',scrub:1} }
      );
    }
    gsap.fromTo(art,
      { '--bg-scroll-y':'-10px' },
      { '--bg-scroll-y':'14px', ease:'none', scrollTrigger:{trigger:art,start:'top bottom',end:'bottom top',scrub:1.2} }
    );
  }
})();

// ===== SOFTTEC LAB / INTERACTIVE MODULES LOGIC =====
(() => {
  // 1. Live FPS & Telemetry
  const fpsEl = document.getElementById('lab-fps');
  const fpsBars = document.querySelectorAll('#lab-fps-bars i');
  const pingBtn = document.getElementById('lab-ping-btn');
  const labSection = fpsEl?.closest('.lab');
  let frameCount = 0, lastTime = performance.now();
  let labVisible = !window.IntersectionObserver;
  let fpsFrame = 0;
  let fpsSamples = [];

  const startFPSMeasure = () => {
    if (!fpsFrame && labVisible && !document.hidden) fpsFrame = requestAnimationFrame(measureFPS);
  };

  function measureFPS() {
    fpsFrame = 0;
    if (!labVisible || document.hidden) return;
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 400) {
      const currentFPS = Math.round((frameCount * 1000) / (now - lastTime));
      fpsSamples.push(currentFPS);
      if (fpsSamples.length > 3) fpsSamples.shift();
      const avg = Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length);
      const displayFPS = Math.max(30, Math.min(144, avg));

      if (fpsEl && !pingBtn?.classList.contains('is-testing')) {
        fpsEl.textContent = String(displayFPS);
      }
      frameCount = 0;
      lastTime = now;

      // Animate bars
      fpsBars.forEach((bar) => {
        const h = 10 + Math.random() * 16;
        bar.style.height = `${h}px`;
      });
    }
    fpsFrame = requestAnimationFrame(measureFPS);
  }
  if (window.IntersectionObserver && labSection) {
    new IntersectionObserver(([entry]) => {
      labVisible = entry.isIntersecting;
      if (labVisible) {
        frameCount = 0;
        lastTime = performance.now();
        startFPSMeasure();
      }
    }, { rootMargin: '120px 0px' }).observe(labSection);
  } else {
    labVisible = true;
  }
  document.addEventListener('visibilitychange', startFPSMeasure, { passive: true });
  startFPSMeasure();

  if (pingBtn) {
    pingBtn.addEventListener('click', () => {
      sfx.playTone(1200, 0.15, 'sawtooth', 0.05);
      pingBtn.classList.add('is-testing');
      fpsBars.forEach((bar) => bar.style.height = '28px');
      if (fpsEl) fpsEl.textContent = '120';
      pingBtn.querySelector('span').textContent = 'TESTING TELEMETRY...';
      setTimeout(() => {
        pingBtn.classList.remove('is-testing');
        pingBtn.querySelector('span').textContent = 'EXECUTAR STRESS TEST';
      }, 1500);
    });
  }

  // 2. Chroma Accent Tuner
  const swatches = document.querySelectorAll('.swatch');
  const colorValEl = document.getElementById('lab-color-val');
  swatches.forEach((btn) => {
    btn.addEventListener('click', () => {
      const hex = btn.dataset.color;
      if (!hex) return;
      document.documentElement.style.setProperty('--hot', hex);
      swatches.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      if (colorValEl) colorValEl.textContent = hex.toUpperCase();
      window.dispatchEvent(new CustomEvent('softtec:color-change', { detail: { color: hex } }));
      sfx.playTone(700 + Math.random() * 400, 0.1, 'sine', 0.04);
    });
  });

  // 3. Matrix Cipher Generator
  const cipherCodeEl = document.getElementById('lab-cipher-code');
  const cipherBtn = document.getElementById('lab-cipher-btn');
  if (cipherCodeEl && cipherBtn) {
    const scrambler = new TextScramble(cipherCodeEl);
    cipherBtn.addEventListener('click', () => {
      const hexRandom = '0x' + Math.random().toString(16).substring(2, 8).toUpperCase() + '_SYS_' + Math.floor(1000 + Math.random() * 9000) + '_CORE';
      scrambler.setText(hexRandom);
      sfx.click();
    });
  }
})();

// ===== AMBIENT DUST ENGINE (Cinematic Floating Stardust) =====
(() => {
  const canvas = document.getElementById('ambient-dust');
  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const numParticles = width < 768 ? 35 : 75;
  const particles = [];
  let mouseX = width / 2;
  let mouseY = height / 2;

  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.6,
      speedX: (Math.random() - 0.5) * 0.22,
      speedY: (Math.random() - 0.5) * 0.22 - 0.08,
      alpha: Math.random() * 0.45 + 0.15,
      pulse: Math.random() * Math.PI * 2,
      color: Math.random() > 0.3 ? '255, 91, 69' : '245, 243, 237'
    });
  }

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < numParticles; i++) {
      const p = particles[i];
      p.pulse += 0.02;
      p.x += p.speedX;
      p.y += p.speedY;

      // Mouse subtle gravitational displacement
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 160) {
        const force = (160 - dist) / 160;
        p.x -= (dx / dist) * force * 0.6;
        p.y -= (dy / dist) * force * 0.6;
      }

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

      ctx.fillStyle = `rgba(${p.color}, ${currentAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(render);
  }
  render();
})();

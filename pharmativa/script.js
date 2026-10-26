(() => {
  const loader = document.querySelector('.loader');
  const header = document.querySelector('[data-header]');
  const year = document.querySelector('[data-year]');
  const progress = document.querySelector('[data-progress]');
  const floatCTA = document.querySelector('.whatsapp-float');
  const loaderCount = document.querySelector('[data-loader-count]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (year) year.textContent = new Date().getFullYear();
  if (loaderCount) { let n = 0; const t = setInterval(() => { n += Math.ceil((100-n)*.22); if (n >= 99) n = 100; loaderCount.textContent = String(n).padStart(2,'0'); if(n === 100) clearInterval(t); }, 55); }
  window.addEventListener('load', () => window.setTimeout(() => loader?.classList.add('is-hidden'), 450), { once: true });
  window.setTimeout(() => loader?.classList.add('is-hidden'), 1800);
  const onScroll = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 24);
    floatCTA?.classList.toggle('is-visible', window.scrollY > window.innerHeight * .55);
    if (progress) { const max = document.documentElement.scrollHeight - innerHeight; progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY/max) : 0})`; }
  };
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('.reveal:not(.reveal--image)').forEach((el) => observer.observe(el));
  const revealImages = () => document.querySelectorAll('.reveal--image:not(.is-visible)').forEach((el) => {
    const bounds = el.getBoundingClientRect();
    if (bounds.bottom > 0 && bounds.top < window.innerHeight * 1.05) el.classList.add('is-visible');
  });
  revealImages();
  window.addEventListener('scroll', revealImages, { passive: true });
  if (!reduceMotion) {
    const cursor = document.querySelector('.cursor');
    if (cursor && matchMedia('(hover:hover)').matches) {
      let cx=-100, cy=-100, tx=-100, ty=-100;
      addEventListener('mousemove', e => { tx=e.clientX; ty=e.clientY; document.body.classList.add('cursor-ready'); }, {passive:true});
      document.querySelectorAll('a,button').forEach(el => { el.addEventListener('mouseenter',()=>document.body.classList.add('cursor-link')); el.addEventListener('mouseleave',()=>document.body.classList.remove('cursor-link')); });
      const moveCursor=()=>{ cx+=(tx-cx)*.18; cy+=(ty-cy)*.18; cursor.style.transform=`translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(moveCursor); }; moveCursor();
    }
    const heroVisual = document.querySelector('[data-parallax]'); let ticking = false;
    const render = () => { if (heroVisual && innerWidth > 680) heroVisual.style.transform = `translate3d(0, ${scrollY * Number(heroVisual.dataset.parallax || .05)}px, 0)`; ticking = false; };
    addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(render); ticking = true; } }, { passive: true });
  }
})();

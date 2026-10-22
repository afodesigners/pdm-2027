/* ==========================================================================
   PDM Motorsport / Media 2027 — GSAP layer

   HOW THIS FILE IS ORGANISED (read this before editing)
   ---------------------------------------------------------------------------
   1. CFG            One place for easing, durations, glitch timing.
   2. Helpers        $, $$, splitWords().
   3. Generic engine Reads data-attributes in the HTML. Most new content needs
                     NO JavaScript: just add an attribute.
                       data-reveal="fade|up|left|right|clip|line"   enter animation
                       data-stagger  (on a parent)                  children reveal in sequence
                       data-split="words" [data-scrub] [data-trigger="load|manual"]
                       data-speed="0.2"   (on figures)              scroll parallax
                       data-split="lines"                           line-by-line text reveal
                       data-float="-1|1"                            figure drifts opposite ways on scroll
                       data-count="10"                              odometer (rolling digits) number
                       data-cursor="Label"                          custom cursor grows + shows label
                       data-magnetic                                button follows cursor
                       data-glitch                                  glitch logo
   4. SECTIONS       One function per <section data-section="name">. Put
                     custom choreography (pins, scrubs, timelines) here.
   5. Boot           Everything runs inside gsap.matchMedia(), so reduced-motion
                     users get the plain page and everything cleans itself up.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- 1. CONFIG ---------- */
  const CFG = {
    ease: 'expo.out',
    easeInOut: 'expo.inOut',
    dur: 1.1,
    stagger: 0.09,
    start: 'top 86%',              // default ScrollTrigger start for reveals
    glitchEvery: [5, 8],           // seconds between logo glitch bursts (min, max)
    desktop: '(min-width: 821px)',
    motionOK: '(prefers-reduced-motion: no-preference)'
  };

  /* ---------- 2. HELPERS ---------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rand = (a, b) => a + Math.random() * (b - a);

  /** Wrap every word in <span.w><span.wi>…</span></span> so each can be masked and moved. */
  function splitWords(el) {
    if (el.classList.contains('is-split')) return $$('.wi', el);
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.classList.add('is-split');
    return $$('.wi', el);
  }

  /* ---------- 3. GENERIC ENGINE ---------- */

  /* 3a. Enter animations for [data-reveal]. Add new looks here, then use them in HTML. */
  const REVEALS = {
    fade:  (el, o) => gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: CFG.dur * 0.8, ease: 'power2.out', ...o }),
    up:    (el, o) => gsap.fromTo(el, { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: CFG.dur, ease: CFG.ease, ...o }),
    left:  (el, o) => gsap.fromTo(el, { autoAlpha: 0, x: -70 }, { autoAlpha: 1, x: 0, duration: CFG.dur * 1.2, ease: CFG.ease, ...o }),
    right: (el, o) => gsap.fromTo(el, { autoAlpha: 0, x: 70 }, { autoAlpha: 1, x: 0, duration: CFG.dur * 1.2, ease: CFG.ease, ...o }),
    line:  (el, o) => gsap.fromTo(el, { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, duration: CFG.dur * 1.3, ease: CFG.easeInOut, ...o }),
    clip:  (el, o) => {
      const img = $('img', el);
      const tl = gsap.timeline(o);
      tl.set(el, { autoAlpha: 1 })
        .fromTo(el, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: CFG.dur * 1.2, ease: CFG.easeInOut })
        .fromTo(img, { scale: 1.25 }, { scale: 1, duration: CFG.dur * 1.6, ease: CFG.ease }, 0);
      return tl;
    }
  };

  function initReveals() {
    // grouped (staggered) reveals
    $$('[data-stagger]').forEach((group) => {
      const items = $$('[data-reveal]', group);
      if (!items.length) return;
      const tl = gsap.timeline({ scrollTrigger: { trigger: group, start: CFG.start, once: true } });
      items.forEach((el, i) => {
        el.classList.add('is-in');
        tl.add(REVEALS[el.dataset.reveal](el, { paused: false }), i * CFG.stagger);
      });
    });
    // single reveals
    $$('[data-reveal]').forEach((el) => {
      if (el.closest('[data-stagger]')) return;
      el.classList.add('is-in');
      const tween = REVEALS[el.dataset.reveal](el, { paused: true, delay: parseFloat(el.dataset.delay || 0) });
      ScrollTrigger.create({ trigger: el, start: CFG.start, once: true, onEnter: () => tween.play() });
    });
  }

  /* 3b. Headlines & text: [data-split="words"] */
  function initSplits() {
    $$('[data-split="lines"]').forEach((el) => {
      const words = splitWords(el);
      el.style.visibility = 'visible';
      // group words into visual lines by their vertical position, then stagger per line
      let line = -1, top = null;
      const idx = words.map((w) => { const t = w.parentNode.offsetTop; if (top === null || Math.abs(t - top) > 4) { line++; top = t; } return line; });
      gsap.set(words, { yPercent: 115 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: CFG.start, once: true } });
      words.forEach((w, i) => tl.to(w, { yPercent: 0, duration: CFG.dur * 1.1, ease: CFG.ease }, idx[i] * 0.12));
    });

    $$('[data-split="words"]').forEach((el) => {
      const mode = el.dataset.trigger;           // "load" and "manual" are handled by their section
      const words = splitWords(el);
      el.style.visibility = 'visible';
      if (el.hasAttribute('data-scrub')) {
        // words light up as you scroll past (Nick Ho "About" style)
        gsap.fromTo(words, { opacity: 0.16 }, {
          opacity: 1, ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 }
        });
        return;
      }
      gsap.set(words, { yPercent: 115 });
      if (mode === 'load' || mode === 'manual') return;
      gsap.to(words, {
        yPercent: 0, duration: CFG.dur * 1.1, ease: CFG.ease, stagger: 0.045,
        scrollTrigger: { trigger: el, start: CFG.start, once: true }
      });
    });
  }

  /* 3c. Scroll parallax on [data-speed] figures + the inner image of .pimg */
  function initParallax() {
    $$('figure[data-speed]').forEach((fig) => {
      gsap.to(fig, { y: () => -parseFloat(fig.dataset.speed) * 160, ease: 'none',
        scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-float]').forEach((fig) => {
      const d = parseFloat(fig.dataset.float);
      gsap.fromTo(fig, { yPercent: -18 * d }, { yPercent: 18 * d, ease: 'none',
        scrollTrigger: { trigger: fig.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.pimg').forEach((p) => {
      const img = $('img', p);
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* 3d. Odometer numbers: each digit is a column of 0-9,0-9 that rolls to its value */
  function initCounters() {
    $$('[data-count]').forEach((el) => {
      const val = String(el.dataset.count);
      el.innerHTML = '';
      const cols = val.split('').map((ch) => {
        const od = document.createElement('span'); od.className = 'od'; od.setAttribute('aria-hidden', 'true');
        const col = document.createElement('span'); col.className = 'od__c';
        col.innerHTML = Array.from({ length: 20 }, (_, i) => `<b>${i % 10}</b>`).join('');
        od.appendChild(col); el.appendChild(od);
        const digit = parseInt(ch, 10);
        const fit = () => { od.style.width = col.children[10 + digit].getBoundingClientRect().width + 'px'; };
        fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
        return { col, to: -(10 + digit) * 5 };
      });
      gsap.set(cols.map((c) => c.col), { yPercent: 0 });
      cols.forEach((c, i) => gsap.to(c.col, { yPercent: c.to, duration: 1.8 + i * 0.25, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    });
  }

  /* 3i. Canvas dither cursor trail — Bayer 4×4 ordered dithering, ported from cursor-trail.framer.website */
  function initCursor() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.documentElement.classList.add('has-cursor');

    // Bayer 4×4 matrix for ordered dithering
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const threshold = (col, row) =>
      (BAYER[((row % 4 + 4) % 4) * 4 + ((col % 4 + 4) % 4)] + 0.5) / 16;

    const COLOR       = '#A0A0A0';   // gray
    const DOT_SIZE    = 3;           // dither cell size in px
    const TRAIL_WIDTH = 26;          // circle radius
    const FADE_DUR    = 1000;        // ms until trail fully fades
    const DENSITY     = 0.72;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:299;display:block';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); document.documentElement.classList.remove('has-cursor'); return; }

    let W = 0, H = 0, rafId = 0, lastTime = performance.now(), lastPos = null;
    const g = Math.max(1, Math.round(DOT_SIZE));

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, window.innerWidth);
      H = Math.max(1, window.innerHeight);
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }

    function clear() { ctx.clearRect(0, 0, W, H); lastPos = null; }

    function drawDot(x, y, alpha = 1) {
      const radius = Math.max(g, TRAIL_WIDTH / 2);
      const c1 = Math.floor((x - radius) / g), c2 = Math.ceil((x + radius) / g);
      const r1 = Math.floor((y - radius) / g), r2 = Math.ceil((y + radius) / g);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = COLOR;
      for (let row = r1; row <= r2; row++) {
        for (let col = c1; col <= c2; col++) {
          const px = col * g, py = row * g;
          const dx = px + g / 2 - x, dy = py + g / 2 - y;
          const dist = Math.sqrt(dx * dx + dy * dy) / radius;
          if (dist > 1) continue;
          if ((1 - dist) ** 0.72 * DENSITY * alpha >= threshold(col, row))
            ctx.fillRect(px, py, g, g);
        }
      }
    }

    function drawTrail(x, y) {
      if (!lastPos) { drawDot(x, y); lastPos = { x, y }; return; }
      const dx = x - lastPos.x, dy = y - lastPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step  = Math.max(g, TRAIL_WIDTH * 0.16);
      const steps = Math.max(1, Math.ceil(dist / step));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        drawDot(lastPos.x + dx * t, lastPos.y + dy * t, 0.82 + 0.18 * t);
      }
      lastPos = { x, y };
    }

    function fade(time) {
      const elapsed = Math.min(64, time - lastTime);
      lastTime = time;
      const alpha = 1 - 0.01 ** (elapsed / Math.max(100, FADE_DUR));
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      rafId = requestAnimationFrame(fade);
    }

    const onMove = (e) => drawTrail(e.clientX, e.clientY);
    const onOut  = (e) => { if (!e.relatedTarget) lastPos = null; };

    resize();
    window.addEventListener('resize',       resize, { passive: true });
    window.addEventListener('pointermove',  onMove, { passive: true });
    window.addEventListener('pointerout',   onOut,  { passive: true });
    window.addEventListener('blur',         clear);
    rafId = requestAnimationFrame(fade);

    return () => {
      document.documentElement.classList.remove('has-cursor');
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize',      resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout',  onOut);
      window.removeEventListener('blur',        clear);
      canvas.remove();
    };
  }

  /* 3j. Smooth scroll (Lenis) wired into ScrollTrigger. Returns the instance or null. */
  function initSmoothScroll() {
    if (!window.Lenis) return null;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href'); const target = id.length > 1 && $(id);
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: id === '#top' ? 0 : -60, duration: 1.4 }); }
    }));
    lenis._off = () => { gsap.ticker.remove(tick); lenis.destroy(); };
    return lenis;
  }

  /* 3k. Page loader: count → glitch logo centred → fly to header → hero plays. */
  function initLoader(lenis, onDone) {
    const L     = $('[data-loader]');
    const n     = $('[data-loader-count]');
    if (!L) { onDone(); return; }
    lenis && lenis.stop();

    const wrap  = $('[data-loader-logo-wrap]');
    const lLogo = $('[data-loader-logo]');
    const lBase = $('.logo__base', lLogo);
    const lR    = $('.logo__ch--r', lLogo);
    const lC    = $('.logo__ch--c', lLogo);
    const hLogo = $('a.logo[data-glitch]');

    // Hide real header logo — loader logo will hand off to it
    gsap.set(hLogo, { autoAlpha: 0 });
    gsap.set(wrap,  { autoAlpha: 0 });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      gsap.set(hLogo, { autoAlpha: 1 });
      L.style.display = 'none';
      lenis && lenis.start();
    };

    // Glitch burst — same algorithm as initGlitch, isolated for the loader logo
    function runGlitch(onComplete) {
      lLogo.classList.add('is-glitch');
      const tl = gsap.timeline({ onComplete });
      for (let i = 0; i < 12; i++) {
        const a = rand(0, 70), b = rand(0, 70 - a * 0.5);
        tl.set(lR,    { x: rand(-9, 9),  y: rand(-2, 2), clipPath: `inset(${a}% 0 ${100 - a - rand(6, 28)}% 0)` })
          .set(lC,    { x: rand(-9, 9),  y: rand(-2, 2), clipPath: `inset(${b}% 0 ${100 - b - rand(6, 28)}% 0)` })
          .set(lBase, { x: rand(-3, 3), skewX: rand(-8, 8), opacity: rand(0.75, 1) })
          .to({}, { duration: rand(0.03, 0.075) });
      }
    }

    // FLIP: fly loader logo from its centred position to the real header logo slot
    function flyToHeader() {
      gsap.set([lR, lC, lBase], { clearProps: 'all' });
      lLogo.classList.remove('is-glitch');

      const from  = lLogo.getBoundingClientRect();
      const to    = hLogo.getBoundingClientRect();
      const dx    = to.left - from.left;
      const dy    = to.top  - from.top;
      const scale = to.width / from.width;

      gsap.to(lLogo, {
        x: dx, y: dy, scale,
        transformOrigin: '0 0',
        duration: 0.85,
        ease: 'expo.inOut',
        onComplete: () => { finish(); onDone(); }
      });
    }

    const o  = { v: 0 };
    const tl = gsap.timeline();
    tl.to(o, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: () => { n.textContent = Math.round(o.v); } })
      .to($('.loader__in', L), { autoAlpha: 0, duration: 0.25 }, '+=0.05')
      .to(wrap, { autoAlpha: 1, duration: 0.35 }, '<+=0.1')
      .call(() => runGlitch(flyToHeader));

    gsap.delayedCall(8, () => { if (!done) { finish(); onDone(); } }); // failsafe
  }

  /* 3l. Media agenda rows: floating image preview that follows the cursor */
  function initAgenda() {
    const rows = $$('.ag'), pv = $('.ag__pv');
    if (!pv || !matchMedia('(hover: hover) and (min-width: 821px)').matches) return;
    const imgs = $$('img', pv);
    const x = gsap.quickTo(pv, 'x', { duration: 0.6, ease: 'power3' });
    const y = gsap.quickTo(pv, 'y', { duration: 0.6, ease: 'power3' });
    const rot = gsap.quickTo(pv, 'rotation', { duration: 0.6, ease: 'power3' });
    let lastX = 0;
    window.addEventListener('pointermove', (e) => { x(e.clientX + 30); y(e.clientY - pv.offsetHeight / 2); rot(gsap.utils.clamp(-6, 6, (e.clientX - lastX) * 0.4)); lastX = e.clientX; });
    rows.forEach((r) => {
      r.addEventListener('pointerenter', () => {
        gsap.to(imgs, { opacity: (i) => (i === +r.dataset.ag ? 1 : 0), duration: 0.01 });
        gsap.to(pv, { autoAlpha: 1, clipPath: 'inset(0% 0 0 0)', duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      });
      r.addEventListener('pointerleave', () => gsap.to(pv, { autoAlpha: 0, duration: 0.3, overwrite: 'auto' }));
    });
    gsap.set(pv, { clipPath: 'inset(100% 0 0 0)' });
  }

  /* 3e. Magnetic buttons (desktop, hover devices only) */
  function initMagnetic() {
    if (!matchMedia('(hover: hover)').matches) return;
    $$('[data-magnetic]').forEach((el) => {
      const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.22);
        qy((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  /* 3f. Infinite marquee rows. Speed in seconds per loop via data-speed, reverse with data-dir="-1".
         Scroll velocity speeds them up briefly. Returns the tweens. */
  function initMarquees(selector) {
    return $$(selector).map((inner) => {
      inner.innerHTML += inner.innerHTML;       // duplicate content for a seamless loop
      const dir = parseFloat(inner.dataset.dir || 1);
      const t = dir > 0
        ? gsap.to(inner, { xPercent: -50, duration: parseFloat(inner.dataset.speed || 40), ease: 'none', repeat: -1 })
        : gsap.fromTo(inner, { xPercent: -50 }, { xPercent: 0, duration: parseFloat(inner.dataset.speed || 40), ease: 'none', repeat: -1 });
      return t;
    });
  }
  function marqueeVelocity(tweens) {
    ScrollTrigger.create({
      onUpdate: (self) => {
        const boost = 1 + Math.min(5, Math.abs(self.getVelocity()) / 350);
        tweens.forEach((t) => { gsap.to(t, { timeScale: boost, duration: 0.2, overwrite: true }); gsap.to(t, { timeScale: 1, duration: 0.9, delay: 0.2 }); });
      }
    });
  }

  /* 3g. Glitch logo — RGB split + sliced offsets. Works on any element with data-glitch. */
  function initGlitch() {
    $$('[data-glitch]').forEach((logo, idx) => {
      const base = $('.logo__base', logo), r = $('.logo__ch--r', logo), c = $('.logo__ch--c', logo);
      let running = false;

      function burst(long) {
        if (running) return; running = true;
        logo.classList.add('is-glitch');
        const steps = long ? 14 : 8;
        const tl = gsap.timeline({ onComplete: () => {
          gsap.set([base, r, c], { clearProps: 'all' });
          logo.classList.remove('is-glitch'); running = false;
        } });
        for (let i = 0; i < steps; i++) {
          const a = rand(0, 70), b = rand(0, 70 - a * 0.5);
          tl.set(r, { x: rand(-9, 9), y: rand(-2, 2), clipPath: `inset(${a}% 0 ${100 - a - rand(6, 28)}% 0)` })
            .set(c, { x: rand(-9, 9), y: rand(-2, 2), clipPath: `inset(${b}% 0 ${100 - b - rand(6, 28)}% 0)` })
            .set(base, { x: rand(-3, 3), skewX: rand(-8, 8), opacity: rand(0.75, 1) })
            .to({}, { duration: rand(0.03, 0.075) });
        }
      }
      logo._burst = burst;

      logo.addEventListener('pointerenter', () => burst(false));
      logo.addEventListener('focus', () => burst(false));

      // periodic burst; footer logo only fires while visible
      const loop = () => {
        gsap.delayedCall(rand(CFG.glitchEvery[0], CFG.glitchEvery[1]) + idx * 0.7, () => {
          if (logo.classList.contains('logo--xl')) {
            if (ScrollTrigger.isInViewport(logo, 0.3)) burst(true);
          } else burst(true);
          loop();
        });
      };
      loop();

      // header logo plays a longer glitch on load (hero timeline calls this too)
      if (!logo.classList.contains('logo--xl')) gsap.delayedCall(3.2, () => burst(true));
      else ScrollTrigger.create({ trigger: logo, start: 'top 90%', once: true, onEnter: () => burst(true) });
    });
  }

  /* 3h. Header: hide on scroll down, show on scroll up; mobile menu */
  function initHeader() {
    const header = $('#header'), burger = $('#burger');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        if (document.body.classList.contains('menu-open')) return;
        const hide = self.direction === 1 && self.scroll() > 240;
        gsap.to(header, { yPercent: hide ? -100 : 0, duration: 0.5, ease: 'power3.out', overwrite: true });
      }
    });
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      document.documentElement.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('.nav a').forEach((a) => a.addEventListener('click', () => {
      document.body.classList.remove('menu-open'); document.documentElement.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- 4. SECTIONS ---------- */
  const state = {};   // shared between sections and boot (e.g. hero intro timeline)
  const SECTIONS = {

    /* HERO — Option 3: marquee rows + staggered driver cards */
    hero() {
      const root = $('[data-section="hero"]');
      const cards = $$('.card', root);
      const cap = $('#heroCap');
      const defaultCap = cap ? cap.textContent : '';

      // load-in timeline
      const words = $$('.hero__title .wi');
      gsap.set(words, { yPercent: 115 });
      gsap.set(cards, { yPercent: 28, autoAlpha: 0, clipPath: 'inset(100% 0 0 0)' });
      gsap.set($$('[data-hero-fade]'), { autoAlpha: 0, y: 24 });
      gsap.set($$('.hero__eyebrow,.hero__scroll,.hero__cap'), { autoAlpha: 0 });
      gsap.set($$('.mq'), { autoAlpha: 0 });

      const tl = gsap.timeline({ defaults: { ease: CFG.ease }, paused: true });
      state.heroIn = tl;
      tl.to($$('.mq'), { autoAlpha: 1, duration: 1.4, stagger: 0.2 }, 0)
        .to($$('.hero__eyebrow'), { autoAlpha: 1, duration: 0.8 }, 0.2)
        .to(cards, { yPercent: 0, autoAlpha: 1, clipPath: 'inset(0% 0 0 0)', duration: 1.5, stagger: 0.1 }, 0.25)
        .to(words, { yPercent: 0, duration: 1.3, stagger: 0.08 }, 0.7)
        .to($$('[data-hero-fade]'), { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 1.1)
        .to($$('.hero__scroll,.hero__cap'), { autoAlpha: 1, duration: 0.8 }, 1.4);

      // marquees
      const mq = initMarquees('.hero .mq__in');
      marqueeVelocity(mq);

      // cards: hover = colour + caption
      cards.forEach((c) => {
        c.addEventListener('pointerenter', () => {
          cards.forEach((x) => x.classList.toggle('on', x === c));
          gsap.to(cards, { opacity: (_, el) => (el === c ? 1 : 0.45), duration: 0.4, overwrite: 'auto' });
          if (cap && cap.textContent !== c.dataset.cap) {
            gsap.fromTo(cap, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4 });
            cap.textContent = c.dataset.cap;
          }
        });
      });
      $('#heroCards').addEventListener('pointerleave', () => {
        cards.forEach((x) => x.classList.remove('on'));
        gsap.to(cards, { opacity: 1, duration: 0.4, overwrite: 'auto' });
        if (cap) cap.textContent = defaultCap;
      });

      // cards: mouse parallax (desktop pointer)
      if (matchMedia('(hover: hover) and (min-width: 821px)').matches) {
        const setters = cards.map((c) => ({
          x: gsap.quickTo(c, 'x', { duration: 1.2, ease: 'power3' }),
          y: gsap.quickTo(c, 'y', { duration: 1.2, ease: 'power3' }), d: parseFloat(c.dataset.depth || 12)
        }));
        root.addEventListener('pointermove', (e) => {
          const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
          setters.forEach((s, i) => { s.x(nx * s.d * (i % 2 ? -1 : 1) * 2); s.y(ny * s.d); });
        });
      }

      // scroll out: cards drift up, title slides
      gsap.to('.hero__cards', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__title', { y: -80, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true } });
    },

    /* BANNER — pinned: framed image opens to full bleed, headline rises */
    banner() {
      const root = $('[data-section="banner"]');
      const stage = $('.banner__stage', root);
      const words = $$('.banner__txt .wi', root);
      const sub = $('[data-banner-sub]', root);
      gsap.set(sub, { autoAlpha: 0, y: 20 });
      gsap.set(words, { yPercent: 115 });

      const mm = gsap.matchMedia();
      mm.add(CFG.desktop, () => {
        gsap.set(stage, { clipPath: 'inset(16% 24% 16% 24%)' });
        gsap.set($$('.banner__p img', root), { scale: 1.25 });
        const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root, start: 'top top', end: '+=140%', scrub: 0.8, pin: true, anticipatePin: 1 } });
        tl.to(stage, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1 })
          .to($$('.banner__p img', root), { scale: 1, duration: 1 }, 0)
          .to(words, { yPercent: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' }, 0.45)
          .to(sub, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.9);
      });
      mm.add('(max-width: 820px)', () => {
        gsap.to(words, { yPercent: 0, duration: 1, stagger: 0.05, ease: CFG.ease, scrollTrigger: { trigger: root, start: 'top 60%', once: true } });
        gsap.to(sub, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.4, scrollTrigger: { trigger: root, start: 'top 60%', once: true } });
      });
    },

    /* ALWAYS — mouse-parallax depth on the right image + list-item hover zoom */
    always() {
      const root = $('[data-section="always"]');
      if (!root) return;
      const img  = $('.always__r img', root);
      const list = $$('.always__list li', root);
      if (!img) return;

      if (!matchMedia('(hover: hover) and (min-width: 821px)').matches) return;

      const qx = gsap.quickTo(img, 'x', { duration: 1.6, ease: 'power3' });
      const qy = gsap.quickTo(img, 'y', { duration: 1.6, ease: 'power3' });

      root.addEventListener('pointermove', (e) => {
        const r = root.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width  - 0.5;
        const ny = (e.clientY - r.top)  / r.height - 0.5;
        qx(nx * -24);
        qy(ny * -16);
      });
      root.addEventListener('pointerleave', () => { qx(0); qy(0); });

      list.forEach((li) => {
        li.addEventListener('pointerenter', () =>
          gsap.to(img, { scale: 1.06, duration: 0.9, ease: 'power2.out', overwrite: 'auto' }));
        li.addEventListener('pointerleave', () =>
          gsap.to(img, { scale: 1,    duration: 1.3, ease: 'power2.out', overwrite: 'auto' }));
      });
    },

    /* KIT — category ticker that skews with scroll speed */
    kit() {
      const t = initMarquees('.tags__in');
      marqueeVelocity(t);
      const skew = gsap.quickTo('.tags__in', 'skewX', { duration: 0.4, ease: 'power3' });
      ScrollTrigger.create({ onUpdate: (s) => skew(gsap.utils.clamp(-8, 8, s.getVelocity() / -300)) });
    },

    /* VIDEOGRAPHY — infinite drag carousel (gsap.utils.wrap technique, CodePen RwKwLWK) */
    videography() {
      const root      = $('[data-section="videography"]');
      if (!root) return;
      const trackWrap = $('[data-vg-wrap]', root);
      const cards     = $$('.vg__card', root);
      const arrowL    = $('.vg__arr--l', root);
      const arrowR    = $('.vg__arr--r', root);
      const N         = cards.length;
      if (N === 0) return;

      let containerW = 0, cardW = 0, spacing = 0, totalW = 0;

      function measure() {
        containerW = trackWrap.offsetWidth;
        cardW      = cards[0].offsetWidth;
        spacing    = cardW + Math.round(containerW * 0.042);
        totalW     = spacing * N;
      }

      const proxy = { x: 0 };

      function layoutCards(x) {
        const cx = containerW / 2;
        cards.forEach((card, i) => {
          let rel = ((i * spacing - x % totalW) % totalW + totalW) % totalW;
          if (rel > totalW / 2) rel -= totalW;
          const lx = cx + rel - cardW / 2;
          const d  = Math.abs(rel) / spacing;
          gsap.set(card, {
            x:        lx,
            yPercent: -50,
            scale:    Math.max(0.72, 1 - d * 0.1),
            opacity:  Math.max(0.28, 1 - d * 0.24),
            zIndex:   Math.round(100 - d * 20),
          });
        });
        const ai = (((Math.round(x / spacing) % N) + N) % N);
        cards.forEach((c, i) => c.classList.toggle('is-active', i === ai));
      }

      function snapTo(x, instant = false) {
        const target = Math.round(x / spacing) * spacing;
        if (instant) { proxy.x = target; layoutCards(target); return; }
        gsap.to(proxy, { x: target, duration: 0.92, ease: 'expo.out', overwrite: true,
          onUpdate: () => layoutCards(proxy.x) });
      }

      let isDrag = false, startCX = 0, startPX = 0, vx = 0, lx = 0, lt = 0;

      trackWrap.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        isDrag = true; startCX = e.clientX; startPX = proxy.x;
        vx = 0; lx = e.clientX; lt = performance.now();
        trackWrap.classList.add('is-dragging');
        trackWrap.setPointerCapture(e.pointerId);
        gsap.killTweensOf(proxy);
      });

      trackWrap.addEventListener('pointermove', (e) => {
        if (!isDrag) return;
        const now = performance.now(), dt = now - lt;
        if (dt > 0) vx = (e.clientX - lx) / dt * 16;
        lx = e.clientX; lt = now;
        proxy.x = startPX - (e.clientX - startCX);
        layoutCards(proxy.x);
      });

      const endDrag = () => {
        if (!isDrag) return;
        isDrag = false;
        trackWrap.classList.remove('is-dragging');
        const advance = Math.abs(vx) > 4 ? (vx < 0 ? 1 : -1) : 0;
        snapTo(proxy.x + advance * spacing * 0.55);
      };

      trackWrap.addEventListener('pointerup',     endDrag);
      trackWrap.addEventListener('pointercancel', endDrag);

      if (arrowL) arrowL.addEventListener('click', () => snapTo(proxy.x - spacing));
      if (arrowR) arrowR.addEventListener('click', () => snapTo(proxy.x + spacing));

      trackWrap.setAttribute('tabindex', '0');
      trackWrap.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  snapTo(proxy.x - spacing);
        if (e.key === 'ArrowRight') snapTo(proxy.x + spacing);
      });

      window.addEventListener('resize', () => { measure(); layoutCards(proxy.x); }, { passive: true });

      gsap.set(trackWrap, { autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: root, start: 'top 72%', once: true,
        onEnter: () => {
          measure(); snapTo(0, true);
          gsap.to(trackWrap, { autoAlpha: 1, duration: 0.9, ease: 'power2.out',
            onComplete: () => ScrollTrigger.refresh() });
        },
      });

      measure(); snapTo(0, true);
    },

    /* CONTACT — chips, validation, submit feedback. Replace the fake send with your endpoint / form plugin. */
    contact() {
      const form = $('#form'), msg = $('#formMsg');
      // buttons in "Programmes" pre-select the matching chip
      $$('[data-pick]').forEach((b) => b.addEventListener('click', () => {
        const r = $(`input[name="interest"][value="${b.dataset.pick}"]`, form); if (r) r.checked = true;
      }));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let ok = true;
        $$('#f-name,#f-email', form).forEach((i) => {
          const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
          i.closest('.fld').classList.toggle('err', bad); if (bad) ok = false;
        });
        if (!ok) {
          msg.style.color = '#ff5d73'; msg.textContent = 'Please add your name and a valid email.';
          gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1,.3)' }); return;
        }
        msg.style.color = ''; msg.textContent = 'Thanks. We’ll be in touch about your season.';
        gsap.fromTo(msg, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 });
        // TODO: send FormData(form) to your backend / WordPress form handler here
      });
    }
  };

  /* ---------- 5. BOOT ---------- */
  const mm = gsap.matchMedia();

  mm.add(CFG.motionOK, () => {
    const lenis = initSmoothScroll();
    const offCursor = initCursor();
    initHeader();
    initSplits();
    initReveals();
    initParallax();
    initCounters();
    initMagnetic();
    initGlitch();
    initAgenda();
    Object.keys(SECTIONS).forEach((name) => { if ($(`[data-section="${name}"]`)) SECTIONS[name](); });
    ScrollTrigger.refresh();
    initLoader(lenis, () => state.heroIn && state.heroIn.play());
    // images change layout once loaded
    window.addEventListener('load', () => ScrollTrigger.refresh());
    return () => { lenis && lenis._off && lenis._off(); offCursor && offCursor(); };
  });

  // Reduced motion: show everything as a normal static page, keep the form + menu working
  mm.add('(prefers-reduced-motion: reduce)', () => {
    document.documentElement.classList.remove('js');
    SECTIONS.contact();
    const burger = $('#burger');
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open);
    });
  });
})();

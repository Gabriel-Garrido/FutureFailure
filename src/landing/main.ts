import './landing.css';
import {
  DEFAULT_LANG,
  LANGS,
  STORAGE_KEY,
  guessLang,
  resolveInitialLang,
  translations,
  type Lang,
} from './i18n';

const $ = <T extends Element = HTMLElement>(selector: string): T | null => document.querySelector<T>(selector);
const $all = <T extends Element = HTMLElement>(selector: string): T[] => Array.from(document.querySelectorAll<T>(selector));

let currentLang: Lang = DEFAULT_LANG;

/* ---------------- i18n application ---------------- */
function applyLang(lang: Lang): void {
  currentLang = lang;
  const dict = translations[lang];
  document.documentElement.lang = lang;

  for (const el of $all('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (!key) continue;
    const value = dict[key];
    if (value === undefined) continue;
    el.textContent = value;
    if (el.classList.contains('glitch')) el.setAttribute('data-text', value);
  }

  const metaEl = $('[data-i18n-meta]');
  const metaKey = metaEl?.getAttribute('data-i18n-meta');
  if (metaEl && metaKey && dict[metaKey]) metaEl.setAttribute('content', dict[metaKey]);

  if (dict['meta.title']) document.title = dict['meta.title'];

  for (const btn of $all<HTMLButtonElement>('.lang-switch button')) {
    btn.classList.toggle('is-active', btn.dataset.lang === lang);
  }
}

function setLang(lang: Lang, persist = true): void {
  applyLang(lang);
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }
}

/* ---------------- Language UI ---------------- */
function buildLanguageSwitch(): void {
  const host = $('#langSwitch');
  if (!host) return;
  for (const { code, flag, label } of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.lang = code;
    btn.textContent = flag;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', () => setLang(code));
    host.appendChild(btn);
  }
}

function buildLanguageModal(onPick: () => void): void {
  const host = $('#langOptions');
  if (!host) return;
  for (const { code, flag, label } of LANGS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-opt';
    btn.innerHTML = `<span class="lang-opt__flag">${flag}</span><span>${label}</span>`;
    btn.addEventListener('click', () => {
      setLang(code);
      onPick();
    });
    host.appendChild(btn);
  }
}

function openModal(): void {
  const modal = $('#langModal');
  if (modal) modal.hidden = false;
}

function closeModal(): void {
  const modal = $('#langModal');
  if (!modal) return;
  modal.style.transition = 'opacity 0.3s ease';
  modal.style.opacity = '0';
  window.setTimeout(() => {
    modal.hidden = true;
    modal.style.opacity = '';
    modal.style.transition = '';
  }, 300);
}

/* ---------------- Scroll reveal + sticky header ---------------- */
function setupReveal(): void {
  const items = $all('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((el) => observer.observe(el));
}

function setupStickyHeader(): void {
  const header = $('#siteHeader');
  if (!header) return;
  const onScroll = (): void => {
    header.classList.toggle('is-stuck', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------------- Ambient particle motes ---------------- */
function setupMotes(): void {
  const canvas = $<HTMLCanvasElement>('#motes');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const colors = ['rgba(54,246,255,', 'rgba(122,92,255,', 'rgba(92,255,157,'];
  type Mote = { x: number; y: number; r: number; vy: number; vx: number; a: number; c: string };
  let motes: Mote[] = [];
  let width = 0;
  let height = 0;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(70, Math.floor((width * height) / 26000));
    motes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.1 + 0.5,
      vy: -(Math.random() * 0.32 + 0.06),
      vx: (Math.random() - 0.5) * 0.18,
      a: Math.random() * 0.5 + 0.15,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
  };

  const tick = (): void => {
    ctx.clearRect(0, 0, width, height);
    for (const m of motes) {
      m.y += m.vy;
      m.x += m.vx;
      if (m.y < -10) {
        m.y = height + 10;
        m.x = Math.random() * width;
      }
      if (m.x < -10) m.x = width + 10;
      if (m.x > width + 10) m.x = -10;
      ctx.beginPath();
      ctx.fillStyle = `${m.c}${m.a})`;
      ctx.shadowColor = `${m.c}0.9)`;
      ctx.shadowBlur = 8;
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(tick);
}

/* ---------------- Boot ---------------- */
function boot(): void {
  buildLanguageSwitch();
  buildLanguageModal(closeModal);
  setupReveal();
  setupStickyHeader();
  setupMotes();

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }

  const initial = resolveInitialLang(stored);
  if (initial) {
    setLang(initial, false);
  } else {
    // First visit: render in the best-guess language, then ask explicitly.
    setLang(guessLang(navigator.language), false);
    openModal();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

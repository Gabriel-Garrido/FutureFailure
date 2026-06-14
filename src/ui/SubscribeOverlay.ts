import './subscribeOverlay.css';
import { getCurrentLang, gt } from '../game/i18n';

const OVERLAY_ID = 'ff-subscribe';
const STORE_KEY = 'ff_subscribers';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Demo-completion subscription form. Built as a DOM overlay (not a Phaser
 * object) so the email input, validation and styling behave like a normal web
 * form on top of the paused canvas.
 *
 * Submissions POST to `VITE_SUBSCRIBE_ENDPOINT` when configured; otherwise they
 * are stored in localStorage so the form stays functional in the demo build
 * with no backend. `onClose` runs when the player dismisses the overlay.
 */
export function showSubscribeOverlay(onClose: () => void): void {
  if (document.getElementById(OVERLAY_ID)) return;
  const text = gt().subscribe;
  const lang = getCurrentLang();

  const root = document.createElement('div');
  root.id = OVERLAY_ID;
  root.className = 'ff-sub';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const panel = el('div', 'ff-sub__panel');
  root.appendChild(panel);

  if (logoAvailable()) {
    const logo = document.createElement('img');
    logo.className = 'ff-sub__logo';
    logo.src = '/brand/logo.png';
    logo.alt = 'Future Failure';
    panel.appendChild(logo);
  }

  panel.appendChild(textEl('p', 'ff-sub__eyebrow', text.eyebrow));
  panel.appendChild(textEl('h2', 'ff-sub__title', text.title));
  panel.appendChild(textEl('p', 'ff-sub__body', text.body));

  const form = document.createElement('form');
  form.className = 'ff-sub__form';
  form.noValidate = true;

  const input = document.createElement('input');
  input.className = 'ff-sub__input';
  input.type = 'email';
  input.name = 'email';
  input.autocomplete = 'email';
  input.placeholder = text.placeholder;
  input.setAttribute('aria-label', text.placeholder);
  // Keep typing inside the form; Phaser's global keyboard handlers ignore it.
  input.addEventListener('keydown', (event) => event.stopPropagation());

  const submit = document.createElement('button');
  submit.className = 'ff-sub__submit';
  submit.type = 'submit';
  submit.textContent = text.submit;

  form.appendChild(input);
  form.appendChild(submit);
  panel.appendChild(form);

  const status = textEl('p', 'ff-sub__status', '');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);

  panel.appendChild(textEl('p', 'ff-sub__privacy', text.privacy));

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'ff-sub__skip';
  skip.textContent = text.skip;
  panel.appendChild(skip);

  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeyDown, true);
    root.remove();
    onClose();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', onKeyDown, true);
  skip.addEventListener('click', close);

  let sent = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (sent) return;
    const email = input.value.trim();
    if (!EMAIL_RE.test(email)) {
      input.classList.add('is-error');
      setStatus(status, text.invalid, 'is-error');
      input.focus();
      return;
    }
    input.classList.remove('is-error');
    submit.disabled = true;
    setStatus(status, text.sending, '');

    void submitEmail(email, lang)
      .then(() => {
        sent = true;
        setStatus(status, text.success, 'is-success');
        input.disabled = true;
        submit.style.display = 'none';
        skip.textContent = text.skip;
        skip.focus();
      })
      .catch(() => {
        submit.disabled = false;
        setStatus(status, text.error, 'is-error');
      });
  });

  document.body.appendChild(root);
  window.setTimeout(() => input.focus(), 60);
}

async function submitEmail(email: string, lang: string): Promise<void> {
  const endpoint = import.meta.env.VITE_SUBSCRIBE_ENDPOINT;
  const payload = { email, lang, source: 'demo-complete', ts: Date.now() };
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`subscribe failed: ${response.status}`);
    return;
  }
  storeLocally(payload);
}

function storeLocally(payload: { email: string; lang: string; ts: number }): void {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list: unknown[] = raw ? JSON.parse(raw) : [];
    list.push(payload);
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* localStorage unavailable — succeed silently so the player still gets feedback */
  }
}

function logoAvailable(): boolean {
  // The brand logo ships in /brand; it always exists in this build.
  return true;
}

function setStatus(node: HTMLElement, message: string, modifier: '' | 'is-error' | 'is-success'): void {
  node.textContent = message;
  node.className = `ff-sub__status${modifier ? ` ${modifier}` : ''}`;
}

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function textEl(tag: string, className: string, content: string): HTMLElement {
  const node = el(tag, className);
  node.textContent = content;
  return node;
}

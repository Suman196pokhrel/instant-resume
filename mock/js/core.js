/* Core: helpers, persisted store, router, app shell, toasts, modals, model picker. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = (p = 'id') => p + '-' + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  const h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24);
  if (d < 14) return d + (d === 1 ? ' day ago' : ' days ago');
  return Math.round(d / 7) + ' weeks ago';
}

function clockTime(ts) {
  const d = new Date(ts);
  const sameDay = new Date().toDateString() === d.toDateString();
  const t = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  return sameDay ? 'Today, ' + t : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) + ', ' + t;
}

function downloadFile(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- Icons (inline SVG, stroke style) ---------- */
const ICON_PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5"/><path d="M19 17v4H6.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>',
  chevLeft: '<path d="m15 18-6-6 6-6"/>',
  chevRight: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.2A9.6 9.6 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M2 2l20 20"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2c0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3a2 2 0 0 1 2-2h2.3A5.6 5.6 0 0 0 22 10c0-4.4-4.5-8-10-8z"/>',
  text: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  flask: '<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3L14 9V3"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.4 5.6"/><circle cx="12" cy="12" r="1"/>',
  orbit: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="9" cy="18" r="2.5"/><path d="M8.3 7.1 15.6 7.6M7 8.4l1.4 7.2M16.4 10l-5.6 6.4"/>',
  flow: '<path d="M3 5h5c4 0 4 7 8 7h5"/><path d="M3 5h5c4 0 4 14 8 14h5" opacity=".55"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/>',
};
function icon(name, size = 16) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

/* ---------- Tooltips ----------
   Any element with data-tip="text" (optional data-tip-title="Heading") gets a small popover on hover
   after a short delay, and immediately on keyboard focus. It is linked with aria-describedby while shown. */
const Tip = (function () {
  let el = null, timer = 0, owner = null;
  function ensure() {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'tip';
    el.className = 'tip';
    el.setAttribute('role', 'tooltip');
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }
  function show(t) {
    const tip = ensure();
    const title = t.dataset.tipTitle;
    tip.innerHTML = (title ? `<strong>${esc(title)}</strong>` : '') + `<span>${esc(t.dataset.tip)}</span>`;
    tip.hidden = false;
    tip.classList.remove('in');
    const r = t.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const above = r.top - th - 8 > 4;
    const left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
    tip.style.left = left + 'px';
    tip.style.top = (above ? r.top - th - 8 : r.bottom + 8) + 'px';
    tip.style.setProperty('--ax', (r.left + r.width / 2 - left) + 'px');
    tip.dataset.side = above ? 'top' : 'bottom';
    requestAnimationFrame(() => tip.classList.add('in'));
    owner = t;
    t.setAttribute('aria-describedby', 'tip');
  }
  function hide() {
    clearTimeout(timer);
    if (el) { el.hidden = true; el.classList.remove('in'); }
    if (owner) { owner.removeAttribute('aria-describedby'); owner = null; }
  }
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const t = e.target.closest('[data-tip]');
    if (t === owner) return;
    hide();
    if (t) timer = setTimeout(() => t.isConnected && show(t), 320);
  });
  document.addEventListener('pointerout', (e) => { const t = e.target.closest('[data-tip]'); if (t && !t.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', (e) => { const t = e.target.closest('[data-tip]'); hide(); if (t && t.matches(':focus-visible')) show(t); });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  document.addEventListener('pointerdown', hide);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('hashchange', hide);
  return { hide };
})();

// Small "i" that explains a term on hover or focus
function infoTip(text, title) {
  return `<button type="button" class="info-tip" data-tip="${esc(text)}" ${title ? `data-tip-title="${esc(title)}"` : ''} aria-label="${esc(title || 'More info')}">${icon('info', 13)}</button>`;
}

/* ---------- Popover menu (overflow "…" actions) ---------- */
function openMenu(anchor, items) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'pop-menu';
  m.setAttribute('role', 'menu');
  m.innerHTML = items.map((it, i) => it === '-' ? '<div class="pop-sep" role="separator"></div>'
    : `<button role="menuitem" class="pop-item ${it.danger ? 'pop-danger' : ''}" data-i="${i}">${it.icon ? icon(it.icon, 15) : ''}<span>${esc(it.label)}</span>${it.hint ? `<span class="pop-hint">${esc(it.hint)}</span>` : ''}</button>`).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  const left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth));
  const below = r.bottom + m.offsetHeight + 8 < window.innerHeight;
  m.style.left = left + 'px';
  m.style.top = (below ? r.bottom + 6 : r.top - m.offsetHeight - 6) + 'px';
  anchor.setAttribute('aria-expanded', 'true');
  const btns = $$('.pop-item', m);
  btns[0] && btns[0].focus();
  m.addEventListener('click', (e) => { const b = e.target.closest('.pop-item'); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); anchor.focus(); it.fn && it.fn(); });
  m.addEventListener('keydown', (e) => {
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
    if (e.key === 'Escape' || e.key === 'Tab') { closeMenu(); anchor.focus(); }
  });
  const outside = (e) => { if (!m.contains(e.target) && !anchor.contains(e.target)) closeMenu(); };
  setTimeout(() => document.addEventListener('pointerdown', outside), 0);
  openMenu.current = { m, anchor, outside };
}
function closeMenu() {
  const c = openMenu.current;
  if (!c) return;
  c.m.remove();
  c.anchor.setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', c.outside);
  openMenu.current = null;
}
window.addEventListener('hashchange', closeMenu);

/* ---------- Store ---------- */
function normalizeKnowledgeBase(kb) {
  kb.contact ||= {}; kb.workRights ||= {};
  for (const key of ['roles', 'volunteering', 'portfolio', 'education', 'skills', 'credentials', 'referees', 'additional']) kb[key] ||= [];
  return kb;
}

const STORAGE_KEY = 'resume-tailor-mock-v1';

const Store = {
  state: null,
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { this.state = JSON.parse(raw); normalizeKnowledgeBase(this.state.kb); if (this.state.sampleKb == null) this.state.sampleKb = this.state.kb.contact.name === MOCK.kb.contact.name; if (this.state.onboarding.draft) normalizeKnowledgeBase(this.state.onboarding.draft); return; }
    } catch (e) { /* storage blocked: fall through to seed */ }
    this.state = seedState();
    this.saveNow();
  },
  save: debounce(function () {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Store.state)); } catch (e) { /* ignore */ }
  }, 200),
  saveNow() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Store.state)); } catch (e) { /* ignore */ }
  },
  reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    this.state = seedState();
    this.saveNow();
  },
  project(id) { return this.state.projects.find((p) => p.id === id); },
};

function seedState() {
  const kb = normalizeKnowledgeBase(clone(MOCK.kb));
  const now = Date.now();
  const H = 3600e3, D = 24 * H;
  const seeds = [
    { jd: 'jd-harbourline', edited: now - 2 * H, tweak: 'harbourline' },
    { jd: 'jd-tessellate', edited: now - 3 * D },
    { jd: 'jd-southerly', edited: now - 15 * D },
  ];
  const projects = seeds.map((s) => {
    const jd = MOCK.jds.find((j) => j.id === s.jd);
    const p = Docs.createProject(kb, jd.text, clone(jd.brief), Docs.suggestSelection(kb, jd.brief), s.edited);
    if (s.tweak === 'harbourline') Docs.applyDemoFlaws(p);
    return p;
  });
  return {
    schemaVersion: 1,
    sampleKb: true,
    kb,
    projects,
    connections: {
      anthropic: { masked: 'sk-ant-…a9F2', model: 'claude-sonnet-5-5', addedAt: now - 20 * D },
    },
    activeModel: { provider: 'anthropic', model: 'claude-sonnet-5-5' },
    demo: { emptyDashboard: false, failGeneration: false },
    onboarding: { step: 0, draft: null, visited: false },
    dismissedOnboardingBanner: false,
    prefs: { paper: 'A4', spelling: 'en-AU', referees: true },
  };
}

/* ---------- Toasts ---------- */
function toast(message, opts = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (opts.kind ? ' toast-' + opts.kind : '');
  el.innerHTML = `<span>${esc(message)}</span>` + (opts.action ? `<button class="toast-action">${esc(opts.action.label)}</button>` : '');
  $('#toasts').appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 250); };
  if (opts.action) $('.toast-action', el).onclick = () => { opts.action.fn(); close(); };
  setTimeout(close, opts.duration || (opts.action ? 6000 : 3200));
}

/* ---------- Modal ---------- */
function openModal({ title, body, actions = [], wide = false, onMount }) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <h2 id="modal-title">${esc(title)}</h2>
          <button class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
        </div>
        <div class="modal-body">${body}</div>
        ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.kind || 'btn-ghost'}" data-action="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}
      </div>
    </div>`;
  const backdrop = $('.modal-backdrop', root);
  requestAnimationFrame(() => backdrop.classList.add('in'));
  const close = () => { backdrop.classList.remove('in'); setTimeout(() => { root.innerHTML = ''; }, 180); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  $$('[data-close]', root).forEach((b) => (b.onclick = close));
  $$('[data-action]', root).forEach((b) => {
    b.onclick = () => { const a = actions[+b.dataset.action]; if (a.fn) { if (a.fn(root) !== false) close(); } else close(); };
  });
  const first = $('input, textarea, select, .modal-foot .btn-primary', root);
  if (first) setTimeout(() => first.focus(), 50);
  if (onMount) onMount(root, close);
  return close;
}

/* ---------- Model picker (one click from anywhere) ---------- */
function modelPickerHtml() {
  const { activeModel, connections } = Store.state;
  const prov = MOCK.providers.find((p) => p.id === activeModel.provider);
  const connected = !!connections[activeModel.provider];
  return `
    <div class="model-picker">
      <button class="model-btn" data-model-toggle aria-haspopup="true" aria-expanded="false">
        <span class="prov-dot prov-${connected ? activeModel.provider : 'none'}"></span>
        <span class="model-btn-text">${connected ? `<span class="muted">${esc(prov.name)}</span> ${esc(activeModel.model)}` : 'No model connected'}</span>
        ${icon('chevDown', 14)}
      </button>
      <div class="model-menu" role="menu" hidden></div>
    </div>`;
}

function renderModelMenu(menu) {
  const { activeModel, connections } = Store.state;
  menu.innerHTML = MOCK.providers.map((p) => {
    const conn = connections[p.id];
    if (!conn) {
      return `<div class="mm-group"><div class="mm-head">${esc(p.name)}</div><a class="mm-add" href="#/settings">${icon('key', 14)} Add a ${esc(p.name)} key</a></div>`;
    }
    return `<div class="mm-group"><div class="mm-head">${esc(p.name)} <span class="muted">${esc(conn.masked)}</span></div>
      ${p.models.map((m) => `<button role="menuitemradio" aria-checked="${activeModel.provider === p.id && activeModel.model === m}" class="mm-item" data-prov="${p.id}" data-model="${m}">
        <span>${esc(m)}</span>${activeModel.provider === p.id && activeModel.model === m ? icon('check', 14) : ''}</button>`).join('')}</div>`;
  }).join('') + `<div class="mm-foot">Calls go straight from this browser to the provider.</div>`;
}

function bindModelPicker(root) {
  const btn = $('[data-model-toggle]', root);
  if (!btn) return;
  const menu = $('.model-menu', root);
  const closeMenu = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', outside); };
  const outside = (e) => { if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu(); };
  btn.onclick = () => {
    if (!menu.hidden) return closeMenu();
    renderModelMenu(menu);
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', outside);
    $$('.mm-item', menu).forEach((it) => (it.onclick = () => {
      Store.state.activeModel = { provider: it.dataset.prov, model: it.dataset.model };
      Store.save();
      closeMenu();
      $$('.model-picker').forEach((mp) => (mp.outerHTML = modelPickerHtml()));
      bindModelPicker(document);
      toast('Switched to ' + it.dataset.model);
    }));
    $$('.mm-add', menu).forEach((a) => (a.onclick = closeMenu));
  };
}

/* ---------- App shell ---------- */
function shell(content, { route, title, actions = '', compact = false, flush = false } = {}) {
  const nav = [
    { r: 'dashboard', label: 'Applications', ic: 'file' },
    { r: 'kb', label: 'Knowledge base', ic: 'book' },
    { r: 'settings', label: 'Settings', ic: 'gear' },
  ];
  return `
  <div class="shell ${compact ? 'shell-compact' : ''}">
    <aside class="sidebar">
      <a class="brand" href="#/dashboard" aria-label="Resume Tailor home">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 11h7M9 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15 3v4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>
        <span class="brand-name">Resume Tailor</span>
      </a>
      <nav class="nav">
        ${nav.map((n) => `<a href="#/${n.r}" class="nav-item ${route === n.r ? 'active' : ''}" title="${n.label}">${icon(n.ic, 18)}<span>${n.label}</span></a>`).join('')}
      </nav>
      <div class="sidebar-foot">
        <button class="nav-item demo-btn" data-demo title="Demo controls">${icon('flask', 18)}<span>Demo controls</span></button>
        <div class="local-note"><span class="dot-ok"></span><span>Stored on this device</span></div>
      </div>
    </aside>
    <div class="main">
      ${title !== null ? `<header class="topbar">
        <div class="topbar-left">${title || ''}</div>
        <div class="topbar-right">${actions}${modelPickerHtml()}</div>
      </header>` : ''}
      <main class="content ${flush ? 'content-flush' : ''}">${content}</main>
    </div>
  </div>`;
}

function bindShell(root) {
  bindModelPicker(root);
  const demo = $('[data-demo]', root);
  if (demo) demo.onclick = openDemoControls;
}

function openDemoControls() {
  const d = Store.state.demo;
  openModal({
    title: 'Demo controls',
    body: `
      <p class="muted small">These exist only in the mock, so you can see states that are hard to reach otherwise.</p>
      <label class="switch-row"><input type="checkbox" id="dc-empty" ${d.emptyDashboard ? 'checked' : ''}><span><strong>Show empty Applications page</strong><br><span class="muted small">Hides applications so you can see the empty state.</span></span></label>
      <label class="switch-row"><input type="checkbox" id="dc-fail" ${d.failGeneration ? 'checked' : ''}><span><strong>Fail the next generation</strong><br><span class="muted small">The next run stops partway with a provider error, so you can try Retry.</span></span></label>
      <div class="switch-row"><span><label for="dc-scenario"><strong>Quick generate scenario</strong></label><br><span class="muted small">Same as adding ?mock=… to the URL. The URL wins if both are set.</span>
        <select id="dc-scenario" class="dc-select">${['happy', 'gaps', 'findings', 'error-stage-1', 'error-stage-2', 'error-stage-3', 'error-stage-4', 'error-stage-5'].map((v) => `<option ${(d.quickScenario || 'happy') === v ? 'selected' : ''}>${v}</option>`).join('')}</select></span></div>
      <label class="switch-row"><input type="checkbox" id="dc-noconn" ${Object.keys(Store.state.connections).length === 0 ? 'checked' : ''}><span><strong>Remove all connections</strong><br><span class="muted small">See what happens with no API key.</span></span></label>
      <hr>
      <button class="btn btn-ghost" id="dc-onb">${icon('book')} Restart onboarding from step 1</button>
      <button class="btn btn-danger-ghost" id="dc-reset">${icon('undo')} Reset all demo data</button>`,
    actions: [{ label: 'Done', kind: 'btn-primary' }],
    onMount(root, close) {
      $('#dc-empty', root).onchange = (e) => { d.emptyDashboard = e.target.checked; Store.save(); Router.refresh(); };
      $('#dc-fail', root).onchange = (e) => { d.failGeneration = e.target.checked; Store.save(); };
      $('#dc-scenario', root).onchange = (e) => { d.quickScenario = e.target.value; Store.save(); };
      $('#dc-noconn', root).onchange = (e) => {
        if (e.target.checked) { Store.state._savedConnections = Store.state.connections; Store.state.connections = {}; }
        else { Store.state.connections = Store.state._savedConnections || seedState().connections; }
        Store.save(); Router.refresh();
      };
      $('#dc-onb', root).onclick = () => { Store.state.onboarding = { step: 0, draft: null, visited: false }; Store.saveNow(); close(); location.hash = '#/onboarding'; };
      $('#dc-reset', root).onclick = () => { Store.reset(); close(); location.hash = '#/dashboard'; Router.refresh(); toast('Demo data reset'); };
    },
  });
}

/* ---------- Router ---------- */
const Views = {};
const Router = {
  cleanup: null,
  parse() {
    const h = location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
    const [name, ...rest] = h.split('/');
    return { name, params: rest };
  },
  refresh() {
    if (Router.cleanup) { try { Router.cleanup(); } catch (e) { console.error(e); } Router.cleanup = null; }
    const { name, params } = Router.parse();
    const view = Views[name] || Views.dashboard;
    const root = $('#app');
    $('#modal-root').innerHTML = '';
    const result = view(root, params);
    if (typeof result === 'function') Router.cleanup = result;
    window.scrollTo(0, 0);
  },
};
window.addEventListener('hashchange', () => Router.refresh());

/* Visitor feedback for the public demo (ported from the Sambad demo).
   "Give feedback" in the demo strip opens a small panel: a 1–5 score, topics, a note, optional role and
   email, and "Point at it" to attach any element on screen. Entries are saved on this device first
   (own localStorage key, so "Reset all demo data" keeps them), then sent in batches to the Cloudflare
   Worker in mock/feedback-worker/ with a Turnstile token. Opened from disk (file://) nothing is sent;
   Demo controls → "Feedback on this device" exports it. Only the Worker's checks are trusted. */
const Feedback = (function () {
  const CFG = window.IR_FEEDBACK || {};
  const SENDS = !!CFG.endpoint && location.protocol !== 'file:';
  const KEY = 'instant-resume-feedback-v1';
  const LIMITS = { cooldownMs: 10000, perDay: 40, keepDelivered: 300, message: 2000, minFillMs: 1200 };
  const TOPICS = [['confusing', 'Something is confusing'], ['missing', 'Something is missing'], ['idea', 'Idea'], ['bug', 'Bug'], ['quality', 'Resume or letter quality'], ['like', 'I like this']];
  const ROLES = ['Job seeker', 'Recruiter or hiring manager', 'Career coach', 'Developer', 'Other'];
  const WIRE = ['id', 'rating', 'topics', 'message', 'screen', 'route', 'target', 'role', 'contact', 'created_at', 'elapsed_ms'];
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).toLowerCase();
  const norm = (t) => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();

  let FB;
  try { FB = JSON.parse(localStorage.getItem(KEY)); } catch (e) { FB = null; }
  if (!FB || !Array.isArray(FB.entries) || typeof FB.device !== 'string') FB = { device: newId(), entries: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(FB)); } catch (e) { /* private mode: kept for this tab only */ } };
  const screenName = () => (($('#app h1') || {}).textContent || Router.parse().name).replace(/\s+/g, ' ').trim().slice(0, 120);

  // Saved on the device first, then queued. Only entries the team already has are ever trimmed.
  function add(fields) {
    if (FB.entries.filter((e) => Date.now() - Date.parse(e.created_at) < 864e5).length >= LIMITS.perDay) {
      toast("That's as much feedback as one person can send in a day. Thank you for all of it.");
      return null;
    }
    const e = { id: newId(), created_at: new Date().toISOString(), screen: screenName(), route: location.hash.slice(0, 200) || '#/', status: SENDS ? 'queued' : 'local', ...fields };
    FB.entries.push(e);
    const delivered = FB.entries.filter((x) => x.status === 'sent' || x.status === 'rejected');
    if (delivered.length > LIMITS.keepDelivered) { const old = new Set(delivered.slice(0, delivered.length - LIMITS.keepDelivered)); FB.entries = FB.entries.filter((x) => !old.has(x)); }
    save();
    setTimeout(flush, 300);
    return e;
  }

  /* ---------- The panel ---------- */
  const blank = (keep) => ({ open: false, done: false, more: false, rating: null, topics: [], message: '', target: '', role: '', contact: '', openedAt: Date.now(), ...keep });
  let s = blank(), opener = null;
  const root = () => $('#feedback-root');
  const where = SENDS ? 'Goes to the Instant Resume team. Please leave out anything private.' : 'Saved on this device for the Instant Resume team. Please leave out anything private.';
  const chip = (attr, v, label, on) => `<button type="button" class="chip chip-btn ${on ? 'chip-ok' : ''}" ${attr}="${esc(v)}" aria-pressed="${on}">${on ? icon('check', 12) : ''}${esc(label)}</button>`;

  function paint() {
    const r = root();
    if (!s.open) { r.innerHTML = ''; return; }
    // Repaints happen on every chip press: keep the panel's entered state and the open "About you" section.
    const shown = !!$('.fb-panel.in', r), more = $('.fb-more', r);
    if (more) s.more = more.open;
    const head = (t) => `<div class="fb-head"><h2>${t}</h2><button class="icon-btn" data-fb-close aria-label="Close">${icon('x')}</button></div>`;
    if (s.done) {
      r.innerHTML = `<div class="fb-panel ${shown ? 'in' : ''}" role="dialog" aria-label="Feedback saved">${head('Feedback')}
        <div class="fb-body fb-done">${icon('check', 22)}<h3>Thanks, that's saved.</h3>
          <p class="muted small">${SENDS ? (navigator.onLine ? "It's on its way to the team." : "You're offline, so it will be sent once there's a connection.") : 'It stays on this device until the team collects it.'}</p>
          <div class="row-gap center"><button class="btn btn-ghost btn-sm" data-fb-again>Add something else</button><button class="btn btn-quiet btn-sm" data-fb-close>Back to the demo</button></div></div></div>`;
    } else {
      r.innerHTML = `<div class="fb-panel ${shown ? 'in' : ''}" role="dialog" aria-label="Share feedback">${head('Share feedback')}
        <div class="fb-body">
          <div class="fb-about">${icon('bookmark', 14)}<span>About <strong>${esc(s.target || screenName())}</strong></span>
            ${s.target ? '<button class="btn btn-quiet btn-sm" data-fb-unpin>Clear</button>' : ''}<button class="btn btn-ghost btn-sm" data-fb-point>Point at it</button></div>
          <div class="fb-label" id="fb-rate-l">How useful would Instant Resume be for you?</div>
          <div class="chips" role="group" aria-labelledby="fb-rate-l">${[1, 2, 3, 4, 5].map((n) => chip('data-fb-rate', n, n, s.rating === n)).join('')}<span class="muted small fb-scale">1 not at all · 5 very</span></div>
          <div class="fb-label" id="fb-topic-l">What's it about?</div>
          <div class="chips" role="group" aria-labelledby="fb-topic-l">${TOPICS.map(([v, l]) => chip('data-fb-topic', v, l, s.topics.includes(v))).join('')}</div>
          <label class="sr-only" for="fb-msg">Your feedback</label>
          <textarea id="fb-msg" rows="4" maxlength="${LIMITS.message}" placeholder="What did you expect? What's missing? What would make you use this for real?">${esc(s.message)}</textarea>
          <div class="muted small fb-count"><span id="fb-count">${s.message.length}</span> of ${LIMITS.message}</div>
          <input class="fb-hp" id="fb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <details class="fb-more" ${s.more || s.role || s.contact ? 'open' : ''}><summary>About you, optional</summary>
            <div class="fb-label">Your role</div><div class="chips">${ROLES.map((x) => chip('data-fb-role', x, x, s.role === x)).join('')}</div>
            <div class="field"><label class="fb-label" for="fb-contact">Email, only if you'd like a reply</label><input type="email" id="fb-contact" maxlength="200" autocomplete="email" placeholder="you@example.com" value="${esc(s.contact)}"></div>
          </details>
          <div class="field-error" id="fb-err" role="alert"></div>
        </div>
        <div class="fb-foot"><span class="muted small">${where}</span><button class="btn btn-primary btn-sm" data-fb-send>${icon('send', 14)} Send feedback</button></div></div>`;
    }
    requestAnimationFrame(() => $('.fb-panel', r) && $('.fb-panel', r).classList.add('in'));
  }

  function open(about = {}) {
    if (!s.open) { opener = document.activeElement; s.openedAt = Date.now(); }
    s.open = true;
    if (s.done) s = blank({ open: true, role: s.role, contact: s.contact });
    if (about.target) s.target = about.target;
    paint();
    const f = $('#fb-msg') || $('#feedback-root [data-fb-close]');
    if (f) f.focus({ preventScroll: true });
  }
  function close() {
    endPoint();
    s.open = false;
    paint();
    if (opener && opener.isConnected) opener.focus();
  }

  async function send(btn) {
    const err = (m) => { $('#fb-err').textContent = m; };
    const msg = s.message.trim(), contact = s.contact.trim();
    // A filled hidden field means a bot. Look successful and store nothing.
    if ($('#fb-hp').value) { s = blank({ open: true, done: true }); return paint(); }
    if (!msg && !s.rating && !s.topics.length) return err('Pick a score or a topic, or write a note.');
    if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return err("That email looks incomplete. Leave it empty if you don't want a reply.");
    const last = FB.entries[FB.entries.length - 1];
    if (last && Date.now() - Date.parse(last.created_at) < LIMITS.cooldownMs) return err('Give it a few seconds before sending more.');
    if (msg && FB.entries.some((e) => norm(e.message) === norm(msg))) return err("You've already sent that exact note.");
    const elapsed = Date.now() - s.openedAt;
    if (elapsed < LIMITS.minFillMs) return err('That was quick. Take a second, then send again.');
    btn.disabled = true;
    const e = add({ rating: s.rating, topics: [...s.topics], message: msg, target: s.target, role: s.role, contact, elapsed_ms: elapsed });
    if (!e) { btn.disabled = false; return; }
    s = blank({ open: true, done: true, role: s.role, contact: s.contact });
    paint();
    $('#feedback-root [data-fb-again]').focus();
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-fb-open],[data-fb-close],[data-fb-again],[data-fb-point],[data-fb-unpin],[data-fb-rate],[data-fb-topic],[data-fb-role],[data-fb-send]');
    if (!t) return;
    const d = t.dataset;
    if ('fbOpen' in d) return s.open ? close() : open();
    if ('fbClose' in d) return close();
    if ('fbAgain' in d) { s = blank({ open: true, role: s.role, contact: s.contact }); paint(); return $('#fb-msg').focus(); }
    if ('fbPoint' in d) return startPoint();
    if ('fbUnpin' in d) { s.target = ''; return paint(); }
    if ('fbSend' in d) return send(t);
    if ('fbRate' in d) s.rating = s.rating === +d.fbRate ? null : +d.fbRate;
    if ('fbTopic' in d) s.topics = s.topics.includes(d.fbTopic) ? s.topics.filter((x) => x !== d.fbTopic) : [...s.topics, d.fbTopic];
    if ('fbRole' in d) s.role = s.role === d.fbRole ? '' : d.fbRole;
    // Repainting replaces the chips, so put focus back on the one just pressed.
    const [k, v] = Object.entries(d).find(([key]) => key.startsWith('fb'));
    paint();
    const again = $$('#feedback-root button').find((b) => b.dataset[k] === v);
    if (again) again.focus();
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'fb-msg') { s.message = e.target.value.slice(0, LIMITS.message); $('#fb-count').textContent = s.message.length; }
    if (e.target.id === 'fb-contact') s.contact = e.target.value.slice(0, 200);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (pointing) { endPoint(); open(); } else if (s.open && !$('#modal-root').innerHTML) close();
  });

  /* ---------- Point at it: pick any element on screen to attach to the feedback ---------- */
  let pointing = false;
  const SKIP = '#feedback-root,#fb-point-box,#fb-point-hint,.demo-notice,#toasts,#modal-root,#tip';
  const pointTarget = (t) => (t instanceof Element && !t.closest(SKIP) ? t.closest('button,a,input,textarea,select,label,h1,h2,h3,.chip,.panel,.kb-card,.nav-item') || t : null);
  function describe(el) {
    const raw = el.getAttribute('aria-label') || el.getAttribute('data-tip') || el.getAttribute('placeholder') || el.innerText || el.textContent || '';
    const t = raw.replace(/\s+/g, ' ').trim();
    return t ? `"${t.length > 70 ? t.slice(0, 68).trim() + '…' : t}"` : `a ${el.tagName.toLowerCase()} element`;
  }
  function pointMove(e) {
    const el = pointTarget(e.target), box = $('#fb-point-box');
    if (!el || !box) { if (box) box.classList.remove('on'); return; }
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' });
    box.classList.add('on');
  }
  function pointClick(e) {
    const el = pointTarget(e.target);
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    s.target = `${describe(el)} on ${screenName()}`.slice(0, 200);
    endPoint();
    open();
  }
  // Presses are swallowed while pointing so a click picks the element instead of pressing it.
  const swallow = (e) => { if (pointTarget(e.target)) { e.preventDefault(); e.stopPropagation(); } };
  function startPoint() {
    pointing = true;
    root().innerHTML = '';
    document.body.classList.add('fb-pointing');
    document.body.insertAdjacentHTML('beforeend', `<div id="fb-point-box" aria-hidden="true"></div><div id="fb-point-hint" role="status">Click the part of the screen you mean. <button class="btn btn-quiet btn-sm" data-fb-point-cancel>Cancel</button></div>`);
    $('[data-fb-point-cancel]').onclick = () => { endPoint(); open(); };
    addEventListener('mousemove', pointMove, true);
    addEventListener('click', pointClick, true);
    ['mousedown', 'pointerdown', 'submit'].forEach((t) => addEventListener(t, swallow, true));
  }
  function endPoint() {
    if (!pointing) return;
    pointing = false;
    document.body.classList.remove('fb-pointing');
    ['#fb-point-box', '#fb-point-hint'].forEach((id) => { const n = $(id); if (n) n.remove(); });
    removeEventListener('mousemove', pointMove, true);
    removeEventListener('click', pointClick, true);
    ['mousedown', 'pointerdown', 'submit'].forEach((t) => removeEventListener(t, swallow, true));
  }

  /* ---------- Sending: batches of up to 10 with a Turnstile token, retried until the Worker answers ---------- */
  let flushing = false, nextTry = 0, tsWidget = null, tsWait = null;
  const wire = (e) => Object.fromEntries(WIRE.filter((k) => e[k] != null && e[k] !== '').map((k) => [k, e[k]]));
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      sc.async = true; sc.onload = res; sc.onerror = () => rej(new Error('Turnstile did not load'));
      document.head.append(sc);
    });
  }
  // One invisible widget, reused. Cloudflare shows a checkbox only if it isn't sure the visitor is a person.
  async function turnstileToken() {
    await loadTurnstile();
    const box = $('#fb-ts');
    return new Promise((res, rej) => {
      const timer = setTimeout(() => { tsWait = null; box.classList.remove('on'); rej(new Error('Human check timed out')); }, 90000);
      tsWait = { res: (t) => { clearTimeout(timer); res(t); }, rej: (er) => { clearTimeout(timer); rej(er); } };
      if (tsWidget === null) {
        tsWidget = turnstile.render('#fb-ts-slot', {
          sitekey: CFG.turnstileSiteKey, appearance: 'interaction-only', execution: 'execute',
          callback: (t) => { box.classList.remove('on'); if (tsWait) tsWait.res(t); tsWait = null; },
          'error-callback': () => { box.classList.remove('on'); if (tsWait) tsWait.rej(new Error('Human check failed')); tsWait = null; return true; },
          'before-interactive-callback': () => box.classList.add('on'),
        });
      } else turnstile.reset(tsWidget);
      turnstile.execute(tsWidget);
    });
  }
  async function flush(force) {
    if (!SENDS || flushing || !navigator.onLine || (force !== true && Date.now() < nextTry)) return;
    const batch = FB.entries.filter((e) => e.status === 'queued').slice(0, 10);
    if (!batch.length) return;
    flushing = true;
    try {
      const token = CFG.turnstileSiteKey ? await turnstileToken() : '';
      const r = await fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device: FB.device, token, items: batch.map(wire) }) });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) { nextTry = Date.now() + (r.status === 429 ? (+res.retry_after || 600) : 60) * 1000; return; }
      const byId = (id) => FB.entries.find((e) => e.id === id);
      (res.accepted || []).forEach((id) => { const e = byId(id); if (e) e.status = 'sent'; });
      (res.dropped || []).forEach((d) => { const e = byId(d.id); if (e) { e.status = 'rejected'; e.reason = d.reason; } });
      save();
      if (FB.entries.some((e) => e.status === 'queued')) setTimeout(() => flush(true), 1500);
    } catch (er) {
      console.warn('Feedback is saved on this device and will be sent later.', er);
      nextTry = Date.now() + 60000;
    } finally { flushing = false; }
  }
  addEventListener('online', () => flush(true));
  setInterval(flush, 60000);
  setTimeout(flush, 2500);

  /* ---------- Feedback on this device (opened from Demo controls) ---------- */
  const STATUS = { sent: ['chip-ok', 'Sent'], queued: ['', 'Waiting to send'], local: ['', 'On this device'], rejected: ['fb-bad', 'Not accepted'] };
  const count = (k) => FB.entries.filter((e) => e.status === k).length;
  function inbox() {
    const list = FB.entries.slice().reverse();
    const topicName = (t) => (TOPICS.find((x) => x[0] === t) || [, t])[1];
    const summary = !list.length ? 'Nothing collected yet.'
      : `${list.length} entr${list.length === 1 ? 'y' : 'ies'}. ` + (SENDS ? `${count('sent')} sent, ${count('queued')} waiting to send.` : 'This copy was opened from disk, so nothing is sent. Export it to keep it.');
    const actions = [];
    if (list.length) actions.push({ label: 'Delete all', kind: 'btn-danger-ghost', fn: () => { setTimeout(confirmClear, 200); } });
    if (SENDS && count('queued')) actions.push({ label: 'Send now', fn: () => { flush(true).then(() => setTimeout(inbox, 200)); } });
    if (list.length) actions.push({ label: 'Export JSON', fn: () => exportAs('json') }, { label: 'Export CSV', kind: 'btn-primary', fn: () => exportAs('csv') });
    openModal({
      title: 'Feedback on this device', wide: true, actions,
      body: `<p class="muted small">${summary}</p><div class="fb-list">${list.map((e) => {
        const [cls, lbl] = STATUS[e.status] || STATUS.local;
        return `<div class="fb-entry"><div class="row-gap small"><strong>${e.rating ? e.rating + ' of 5' : 'Feedback'}</strong><span class="muted">${esc(clockTime(Date.parse(e.created_at)))}</span><span class="chip ${cls}" ${e.reason ? `data-tip="${esc(e.reason)}"` : ''}>${lbl}</span></div>
          ${e.message ? `<p>${esc(e.message)}</p>` : ''}
          <div class="muted small">${[e.target || e.screen, (e.topics || []).map(topicName).join(', '), e.role, e.contact].filter(Boolean).map(esc).join('<br>')}</div></div>`;
      }).join('')}</div>`,
    });
  }
  function exportAs(f) {
    const day = new Date().toISOString().slice(0, 10), cols = ['created_at', 'status', ...WIRE.filter((k) => !['id', 'created_at', 'elapsed_ms'].includes(k)), 'id'];
    const q = (v) => `"${String(Array.isArray(v) ? v.join('; ') : v ?? '').replace(/"/g, '""')}"`;
    if (f === 'json') downloadFile(`instant-resume-feedback-${day}.json`, JSON.stringify(FB.entries, null, 2));
    else downloadFile(`instant-resume-feedback-${day}.csv`, [cols.join(','), ...FB.entries.map((e) => cols.map((k) => q(e[k])).join(','))].join('\n'), 'text/csv');
    toast(`Exported ${FB.entries.length} entries`);
  }
  function confirmClear() {
    const unsent = FB.entries.filter((e) => e.status !== 'sent').length;
    openModal({
      title: 'Delete all feedback on this device?',
      body: `<p>${unsent ? `<strong>${unsent} entr${unsent === 1 ? 'y has' : 'ies have'} not reached the team.</strong> Export them first if you want to keep them.` : 'Everything here has already reached the team.'}</p>`,
      actions: [{ label: 'Cancel', fn: () => { setTimeout(inbox, 200); } }, { label: 'Delete all', kind: 'btn-danger-ghost', fn: () => { FB.entries = []; save(); toast('Feedback on this device deleted'); } }],
    });
  }

  return { inbox, summary: () => (FB.entries.length ? `${FB.entries.length} saved${SENDS ? `, ${count('queued')} waiting to send` : ''}` : 'Nothing yet') };
})();

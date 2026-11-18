/* Workspace: job panel + checks, live preview, inspector (Content / Structure / Design), history, export. */

Views.project = function (root, params) {
  const st = Store.state;
  const p = Store.project(params[0]);
  if (!p) { location.hash = '#/dashboard'; return; }

  const ui = {
    kind: 'resume',
    selected: null,          // section id
    tab: 'content',          // inspector tab
    left: 'job',             // job | checks
    zoom: null,              // null = fit
    viewing: null,           // revision being previewed
    pending: null,           // { sectionId, before, after, instruction, warnings, ops }
    busy: false,             // rewrite in progress
    lastRenderMs: 0,
    leftOpen: window.innerWidth >= 1180, // SPEC §14.5: open from 1180px wide
    instructionDraft: '',
  };
  const undo = { resume: [], coverLetter: [] };
  let alive = true;
  let burst = null; // coalesce rapid edits/adjustments into one undo step

  const doc = () => p.docs[ui.kind];
  const section = (id) => doc().sections.find((s) => s.id === id);
  const kindLabel = (k) => (k === 'resume' ? 'Resume' : 'Cover letter');

  /* ---------- Persistence helpers ---------- */
  function setSaveState(state) {
    const el = $('[data-save]', root);
    if (!el) return;
    el.className = 'save-pill ' + state;
    el.innerHTML = state === 'saving' ? '<span class="spinner spinner-xs"></span> Saving' : `${icon('check', 13)} Saved`;
  }
  const settle = debounce(() => { Store.saveNow(); setSaveState('saved'); }, 600);

  function commit(revKind, label, coalesceKey) {
    // An undo step reads like its revision: "Undid: Moved Summary down", as the real app (SPEC §6.4)
    const top = undo[ui.kind][undo[ui.kind].length - 1];
    if (top && top.fresh && revKind !== 'restore') { top.label = label; delete top.fresh; updateUndoBtn(); }
    const revs = p.revisions[ui.kind];
    const last = revs[revs.length - 1];
    const now = Date.now();
    if (coalesceKey && last && last.coalesceKey === coalesceKey && now - last.ts < 60000) {
      last.snapshot = clone(doc()); last.ts = now;
    } else {
      revs.push({ id: uid('r'), ts: now, kind: revKind, label, coalesceKey, snapshot: clone(doc()) });
    }
    p.updatedAt = now;
    setSaveState('saving');
    settle();
    if ($('.drawer.open', root)) renderHistory();
  }

  function pushUndo(label, burstKey) {
    if (burstKey && burst && burst.key === burstKey) { clearTimeout(burst.t); burst.t = setTimeout(() => (burst = null), 1500); return; }
    undo[ui.kind].push({ label, snapshot: clone(doc()), fresh: true }); // commit() names it with the revision label
    if (undo[ui.kind].length > 50) undo[ui.kind].shift();
    if (burstKey) burst = { key: burstKey, t: setTimeout(() => (burst = null), 1500) };
    updateUndoBtn();
  }

  function doUndo() {
    const u = undo[ui.kind].pop();
    if (!u) return;
    p.docs[ui.kind] = u.snapshot;
    if (ui.selected && !section(ui.selected)) ui.selected = null;
    ui.pending = null;
    commit('restore', 'Undid: ' + u.label);
    renderPreview(); renderInspector(); renderLeft(); updateUndoBtn();
    toast('Undid: ' + u.label);
  }
  function updateUndoBtn() {
    const b = $('[data-undo]', root);
    if (!b) return;
    const u = undo[ui.kind][undo[ui.kind].length - 1];
    b.disabled = !u;
    b.dataset.tip = u ? `Undo: ${u.label} (Ctrl+Z)` : 'Nothing to undo';
  }

  /* ---------- Layout ---------- */
  function renderAll() {
    root.innerHTML = shell(`
      <div class="ws ${ui.leftOpen ? '' : 'left-closed'}">
        <div class="ws-bar">
          <div class="ws-bar-left">
            <a class="crumb" href="#/dashboard">${icon('chevLeft', 15)} Applications</a>
            <span class="crumb-sep">/</span>
            <span class="ws-title" data-tip="${esc(p.role)} at ${esc(p.company)}">${esc(p.role)} <span class="muted">at ${esc(p.company)}</span></span>
          </div>
          <div class="doc-tabs" role="tablist" aria-label="Document">
            ${['resume', 'coverLetter'].map((k) => `<button role="tab" aria-selected="${ui.kind === k}" class="${ui.kind === k ? 'on' : ''}" data-kind="${k}">${kindLabel(k)}</button>`).join('')}
          </div>
          <div class="ws-bar-right">
            <span class="save-pill saved" data-save>${icon('check', 13)} Saved</span>
            <div class="tool-cluster">
              <button class="icon-btn" data-undo aria-label="Undo">${icon('undo', 16)}</button>
              <button class="icon-btn" data-copy-doc aria-label="Copy as plain text" data-tip="Copy as plain text, for job sites that ask you to paste">${icon('copy', 16)}</button>
              <button class="btn btn-quiet btn-sm" data-history>${icon('history', 15)} History</button>
            </div>
            <button class="btn btn-primary btn-sm" data-export>${icon('download', 15)} Export PDF</button>
            ${modelPickerHtml()}
          </div>
        </div>
        <div class="ws-body">
          <aside class="ws-left" aria-label="Job and checks">
            <div class="seg seg-full" role="tablist">
              <button data-left="job">Job</button>
              <button data-left="checks">Checks <span class="count" data-check-count></span></button>
            </div>
            <div class="ws-left-body" data-left-body></div>
          </aside>
          <section class="ws-preview" aria-label="Preview">
            <div class="preview-bar">
              <button class="icon-btn" data-toggle-left aria-label="Toggle job panel" data-tip="Show or hide the job panel">${icon('panel', 16)}</button>
              <div class="zoom">
                <button class="icon-btn" data-zoom="-" aria-label="Zoom out" data-tip="Zoom out">−</button>
                <button class="zoom-val" data-zoom="fit" data-tip="Fit to width"></button>
                <button class="icon-btn" data-zoom="+" aria-label="Zoom in" data-tip="Zoom in">+</button>
              </div>
              <span class="render-status muted small" data-render-status></span>
            </div>
            <div class="preview-scroll" data-scroll>
              <div class="revision-banner" data-rev-banner hidden></div>
              <div class="sheet-wrap" data-sheet-wrap><div class="sheet" data-sheet></div></div>
              <div class="typst-loader" data-loader hidden>
                <div class="tl-card"><strong>Loading the Typst renderer</strong><span class="muted small">6.4 MB, loaded once per session</span><div class="bar"><div class="bar-fill" data-loader-fill></div></div></div>
              </div>
            </div>
          </section>
          <aside class="ws-inspector" aria-label="Inspector">
            <div class="insp-tabs" role="tablist">
              ${[['content', 'Content', 'text'], ['structure', 'Structure', 'layers'], ['design', 'Design', 'palette']].map(([k, l, ic]) => `<button role="tab" data-tab="${k}">${icon(ic, 15)} ${l}</button>`).join('')}
            </div>
            <div class="insp-body" data-insp></div>
            <div class="insp-lock" data-insp-lock hidden><p>You're viewing an older revision. Restore it or go back to the current version to edit.</p></div>
          </aside>
        </div>
        <div class="drawer" data-drawer aria-hidden="true" role="dialog" aria-label="History">
          <div class="drawer-head"><h2>History</h2><button class="icon-btn" data-close-drawer aria-label="Close history">${icon('x')}</button></div>
          <p class="muted small drawer-sub">Every change to the ${kindLabel(ui.kind).toLowerCase()} is saved here automatically.</p>
          <ol class="rev-list" data-revs></ol>
        </div>
      </div>`, { route: 'dashboard', title: null, compact: true, flush: true });
    bindShell(root);
    bindChrome();
    renderLeft(); renderInspector(); updateUndoBtn();
    bootRenderer();
  }

  function bindChrome() {
    $$('[data-kind]', root).forEach((b) => (b.onclick = () => {
      if (ui.kind === b.dataset.kind) return;
      ui.kind = b.dataset.kind; ui.selected = null; ui.pending = null; ui.viewing = null;
      $$('[data-kind]', root).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      vt(() => {
        renderPreview(); renderInspector(); renderLeft(); updateUndoBtn();
        if ($('.drawer.open', root)) renderHistory();
      }, 'doc');
    }));
    $$('[data-left]', root).forEach((b) => (b.onclick = () => { if (ui.left === b.dataset.left) return; ui.left = b.dataset.left; renderLeft({ enter: true }); }));
    $$('[data-tab]', root).forEach((b) => (b.onclick = () => { ui.tab = b.dataset.tab; renderInspector(); }));
    $('[data-undo]', root).onclick = doUndo;
    $('[data-copy-doc]', root).onclick = () => copyText(Docs.plainText(doc(), st.kb, p.brief), kindLabel(ui.kind));
    $('[data-history]', root).onclick = openHistory;
    $('[data-close-drawer]', root).onclick = closeHistory;
    $('[data-export]', root).onclick = openExport;
    $('[data-toggle-left]', root).onclick = () => { ui.leftOpen = !ui.leftOpen; $('.ws', root).classList.toggle('left-closed', !ui.leftOpen); fitZoom(); };
    $$('[data-zoom]', root).forEach((b) => (b.onclick = () => {
      const z = b.dataset.zoom;
      const cur = ui.zoom || currentFit();
      ui.zoom = z === 'fit' ? null : Math.min(1.6, Math.max(0.4, +(cur + (z === '+' ? 0.1 : -0.1)).toFixed(2)));
      applyZoom();
    }));
    $('[data-sheet]', root).addEventListener('click', (e) => {
      if (ui.viewing) return;
      const s = e.target.closest('[data-section-id]');
      if (!s) return;
      selectSection(s.dataset.sectionId, { scroll: false });
    });
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);
  }

  const onResize = debounce(() => fitZoom(), 100);
  function onKey(e) {
    const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inField && !e.shiftKey) { e.preventDefault(); doUndo(); }
    if (e.key === 'Escape' && $('.drawer.open', root)) closeHistory();
  }

  /* ---------- Preview / renderer ---------- */
  async function bootRenderer() {
    if (sessionStorage.getItem('rt-typst') || reducedMotion()) { sessionStorage.setItem('rt-typst', '1'); renderPreview(); afterBoot(); return; }
    const loader = $('[data-loader]', root);
    loader.hidden = false;
    const fill = $('[data-loader-fill]', root);
    for (let i = 1; i <= 10; i++) { await sleep(110); if (!alive) return; fill.style.width = i * 10 + '%'; }
    sessionStorage.setItem('rt-typst', '1');
    loader.classList.add('out');
    renderPreview();
    setTimeout(() => (loader.hidden = true), 300);
    afterBoot();
  }

  function afterBoot() {
    const fresh = sessionStorage.getItem('rt-fresh');
    if (fresh) {
      sessionStorage.removeItem('rt-fresh');
      const ch = Docs.runChecks(p, 'resume', st.kb);
      toast(`Generated in ${fresh}s. ${ch.findings.length ? 'Review the checks before you export.' : 'No issues found.'}`);
      $('[data-sheet]', root).classList.add('reveal');
    }
  }

  function currentFit() {
    const scroll = $('[data-scroll]', root);
    if (!scroll) return 1;
    const avail = scroll.clientWidth - 48;
    return Math.max(0.4, Math.min(1.25, avail / 794));
  }
  function fitZoom() { if (ui.zoom == null) applyZoom(); }
  function applyZoom() {
    const z = ui.zoom || currentFit();
    const wrap = $('[data-sheet-wrap]', root);
    if (!wrap) return;
    wrap.style.setProperty('--zoom', z);
    $('.zoom-val', root).textContent = Math.round(z * 100) + '%' + (ui.zoom == null ? ' fit' : '');
  }

  function renderPreview(opts = {}) {
    const sheet = $('[data-sheet]', root);
    if (!sheet) return;
    const t0 = performance.now();
    const source = ui.viewing ? ui.viewing.snapshot : doc();
    let shown = source;
    if (ui.pending && !ui.viewing) {
      shown = clone(source);
      const i = shown.sections.findIndex((s) => s.id === ui.pending.sectionId);
      if (i >= 0) shown.sections[i] = ui.pending.after;
    }
    sheet.className = 'sheet paper-' + st.prefs.paper.toLowerCase() + (sheet.classList.contains('reveal') ? ' reveal' : '');
    sheet.innerHTML = ui.kind === 'resume' ? Docs.renderResume(shown, st.kb) : Docs.renderCoverLetter(shown, st.kb, p.brief);
    // Each section glides to its new place when the order or visibility changes (see vt in core.js)
    $$('[data-section-id]', sheet).forEach((el) => (el.style.viewTransitionName = 'ds-' + el.dataset.sectionId));
    if (ui.selected && !ui.viewing) {
      const el = $(`[data-section-id="${ui.selected}"]`, sheet);
      if (el) { el.classList.add('is-selected'); traceBullets(el, shown.sections.find((x) => x.id === ui.selected)); }
    }
    if (ui.pending && !ui.viewing) { const el = $(`[data-section-id="${ui.pending.sectionId}"]`, sheet); if (el) el.classList.add('is-proposed'); }
    if (ui.busy) { const el = $(`[data-section-id="${ui.selected}"]`, sheet); if (el) el.classList.add('is-rewriting'); }
    applyZoom();
    Tip.sweep();
    // Pretend compile time: real DOM time plus a little, as Typst WASM would add
    const ms = Math.max(4, Math.round(performance.now() - t0 + 6 + Math.random() * 8));
    ui.lastRenderMs = ms;
    const pages = Math.max(1, Math.ceil((sheet.scrollHeight - 2) / (st.prefs.paper === 'A4' ? 1123 : 1056)));
    const status = $('[data-render-status]', root);
    status.innerHTML = `${opts.design ? icon('zap', 12) + ' ' : ''}Rendered in ${ms} ms<span class="dotsep"></span>${pages} ${pages === 1 ? 'page' : 'pages'}<span class="dotsep"></span>${st.prefs.paper}`;
    status.classList.remove('pulse'); void status.offsetWidth; status.classList.add('pulse');
    const banner = $('[data-rev-banner]', root);
    if (ui.viewing) {
      banner.hidden = false;
      banner.innerHTML = `${icon('history', 15)}<span>Viewing the revision from ${esc(clockTime(ui.viewing.ts))}: ${esc(ui.viewing.label)}</span><button class="btn btn-primary btn-sm" data-restore>Restore this version</button><button class="btn btn-ghost btn-sm" data-current>Back to current</button>`;
      $('[data-restore]', banner).onclick = () => restoreRevision(ui.viewing);
      $('[data-current]', banner).onclick = () => { ui.viewing = null; renderPreview(); lockInspector(false); renderHistory(); };
    } else banner.hidden = true;
  }

  // In the selected section, hovering a bullet shows the knowledge base fact it was written from
  function traceBullets(el, s) {
    if (!s || !s.items) return;
    const bullets = s.items.flatMap((it) => it.bullets || []);
    // Bullets that Checks flags get the amber state, so the tooltip never contradicts a finding
    const flagged = new Set(Docs.runChecks(p, ui.kind, st.kb).findings.map((f) => f.bulletId).filter(Boolean));
    $$('li[data-bullet-id]', el).forEach((li) => {
      const b = bullets.find((x) => x.id === li.dataset.bulletId);
      const hl = b && Docs.findHighlight(st.kb, b.source);
      li.classList.add('traced');
      if (!hl || flagged.has(b.id)) li.classList.add('untraced');
      li.dataset.tipTitle = !hl ? 'No source found' : flagged.has(b.id) ? 'Differs from your knowledge base' : 'From your knowledge base';
      li.dataset.tip = hl ? hl.text : "This bullet doesn't trace to a fact in your knowledge base. Checks flag it.";
    });
  }

  function flashSection(id) {
    const el = $(`[data-section-id="${id}"]`, root);
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  function selectSection(id, { scroll = true, tab = 'content' } = {}) {
    if (ui.pending && ui.pending.sectionId !== id) { ui.pending = null; }
    ui.selected = id; ui.tab = tab;
    renderPreview(); renderInspector();
    if (scroll) flashSection(id);
  }

  /* ---------- Left panel: job + checks ---------- */
  function ring(pct, enter) {
    const c = +(2 * Math.PI * 15).toFixed(2);
    return `<svg class="ring ${enter ? 'ring-enter' : ''}" viewBox="0 0 36 36" width="44" height="44" aria-hidden="true" style="--c:${c}">
      <circle cx="18" cy="18" r="15" class="ring-track"/><circle cx="18" cy="18" r="15" class="ring-fill" stroke-dasharray="${c}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(2)}"/></svg>`;
  }

  function renderLeft({ enter = false } = {}) {
    const body = $('[data-left-body]', root);
    if (!body) return;
    $$('[data-left]', root).forEach((b) => { b.classList.toggle('on', b.dataset.left === ui.left); b.setAttribute('aria-selected', b.dataset.left === ui.left); });
    body.classList.toggle('lp-enter', enter);
    const ch = Docs.runChecks(p, ui.kind, st.kb);
    const cc = $('[data-check-count]', root);
    cc.textContent = ch.findings.length || '';
    cc.classList.toggle('count-warn', ch.findings.length > 0);
    const kindName = kindLabel(ui.kind).toLowerCase();

    if (ui.left === 'job') {
      const b = p.brief;
      // A requirement is "reflected" when a job keyword it mentions appears in this document
      const reqs = b.requirements.map((r) => {
        const kws = b.keywords.filter((k) => Docs.kwMatch(r, k));
        return { r, state: !kws.length ? 'none' : kws.some((k) => ch.matched.includes(k)) ? 'ok' : 'miss' };
      });
      const tracked = reqs.filter((x) => x.state !== 'none').length;
      body.innerHTML = `
        <div class="job-head"><h3>${esc(b.title)}</h3><div class="job-meta">${esc(b.company)}<span class="dotsep"></span>${esc(b.location)}</div></div>
        <section class="lp-block">
          <div class="lp-label">Requirements <span class="lp-count">${reqs.filter((x) => x.state === 'ok').length} of ${tracked} reflected</span>${infoTip(`A requirement is reflected when a job keyword it mentions appears in this ${kindName}. Ones without keywords have no mark.`)}</div>
          <ul class="req-check">${reqs.map((x) => `<li class="rq-${x.state}"><span class="rq-mark">${x.state === 'ok' ? icon('check', 10) : ''}</span><span>${esc(x.r)}</span></li>`).join('')}</ul>
        </section>
        <section class="lp-block">
          <div class="lp-label">Keywords <span class="lp-count">${ch.matched.length} of ${b.keywords.length} in this ${kindName}</span></div>
          <div class="chips chips-tight">${b.keywords.map((k) => `<span class="chip ${ch.matched.includes(k) ? 'chip-ok' : 'chip-missing'}">${ch.matched.includes(k) ? icon('check', 11) : ''}${esc(k)}</span>`).join('')}</div>
        </section>
        <section class="lp-block">
          <div class="lp-label"><label for="ws-notes">Your notes</label>${infoTip('Used as a fact you supplied. Changes apply the next time you regenerate or rewrite.')}</div>
          <textarea id="ws-notes" class="lp-notes" rows="2" data-notes placeholder="Why you want this job, what to emphasise, who referred you">${esc(p.notes || '')}</textarea>
        </section>
        <details class="lp-block disclosure jd-details"><summary>Job description</summary><pre class="jd-text">${esc(p.jdText)}</pre></details>
        <div class="lp-end"><button class="btn btn-quiet btn-sm" data-regen>${icon('spark', 14)} Regenerate both documents</button></div>`;
      $('[data-regen]', body).onclick = regenerate;
      $('[data-notes]', body).oninput = (e) => { p.notes = e.target.value; p.updatedAt = Date.now(); setSaveState('saving'); settle(); };
      return;
    }

    const groups = [['grounding', 'Claims not found in your knowledge base', 'Every claim traces to your knowledge base'], ['banned', 'Banned phrases', 'No banned phrases']];
    const pct = Math.round((ch.matched.length / Math.max(1, p.brief.keywords.length)) * 100);
    const n = ch.findings.length;
    const parseOk = ch.parse.filter((x) => x.ok).length;
    body.innerHTML = `
      <div class="verdict ${n ? 'verdict-warn' : 'verdict-ok'}">${icon(n ? 'alert' : 'check', 16)}<div><strong>${n ? `${n} ${n === 1 ? 'thing' : 'things'} to review` : 'Nothing to fix'}</strong><span>${n ? 'Select one to jump to it. You can still export.' : `This ${kindName} is ready to export.`}</span></div></div>
      <section class="lp-block">
        <div class="lp-label">Job keyword match</div>
        <div class="kw-ring">${ring(pct, enter)}<div><strong>${ch.matched.length} of ${p.brief.keywords.length}</strong><span class="muted small">keywords appear in this ${kindName}</span></div></div>
        ${ch.missing.length ? `<ul class="missing-list">${ch.missing.map((m) => `<li><span class="chip chip-missing">${esc(m.keyword)}</span>
          ${m.inKb ? `<button class="link-btn" data-emph="${esc(m.keyword)}" data-tip="It's in your knowledge base. Ask for a rewrite that brings it forward.">${icon('spark', 12)} Emphasise</button>` : `<button class="link-btn" data-add-kw="${esc(m.keyword)}" data-tip="Not in your knowledge base yet. Add what you did, then it can be claimed.">${icon('plus', 12)} Add it</button>`}</li>`).join('')}</ul>` : '<p class="small ok-text">Every keyword from the job brief appears.</p>'}
      </section>
      ${groups.map(([t, label, clean]) => {
        const fs = ch.findings.filter((f) => f.type === t);
        if (!fs.length) return `<div class="ok-row">${icon('check', 13)} ${clean}</div>`;
        return `<section class="lp-block"><div class="lp-label">${label} <span class="count count-warn">${fs.length}</span></div>
          ${fs.map((f) => `<button class="finding finding-${t}" data-goto-section="${f.sectionId}">
            <span class="finding-title">${icon('alert', 13)} ${esc(f.title)}</span><span class="finding-detail">${esc(f.detail)}</span><span class="finding-go">Go to ${esc((section(f.sectionId) || {}).title || 'section')} ${icon('arrowRight', 12)}</span></button>`).join('')}
        </section>`;
      }).join('')}
      <details class="lp-block disclosure" ${parseOk === ch.parse.length ? '' : 'open'}><summary>Parse safety <span class="lp-count">${parseOk} of ${ch.parse.length} pass</span></summary>
        <ul class="parse-list">${ch.parse.map((x) => `<li class="${x.ok ? 'ok' : 'bad'}">${icon(x.ok ? 'check' : 'alert', 13)} ${esc(x.label)}${!x.ok && x.hint ? `<div class="muted small">${esc(x.hint)}</div>` : ''}</li>`).join('')}</ul>
        <p class="muted small">There's no universal "ATS score". These checks cover whether job sites can read the file; keyword match is shown above, separately.</p>
      </details>
      <p class="lp-foot">${icon('zap', 12)} Checks run on this device after every change. No LLM call.</p>`;
    $$('[data-goto-section]', body).forEach((b) => (b.onclick = () => selectSection(b.dataset.gotoSection)));
    $$('[data-add-kw]', body).forEach((b) => (b.onclick = () => openAddEvidence({ requirement: b.dataset.addKw, keyword: b.dataset.addKw, onSaved: () => renderLeft() })));
    $$('[data-emph]', body).forEach((b) => (b.onclick = () => {
      const target = doc().sections.find((s) => s.kind === 'experience') || doc().sections[0];
      ui.instructionDraft = 'Emphasise ' + b.dataset.emph;
      selectSection(target.id);
      const box = $('[data-instruction]', root); if (box) box.focus();
    }));
  }

  /* ---------- Inspector ---------- */
  function lockInspector(on) { $('[data-insp-lock]', root).hidden = !on; }

  function renderInspector() {
    $$('[data-tab]', root).forEach((b) => { b.classList.toggle('on', b.dataset.tab === ui.tab); b.setAttribute('aria-selected', b.dataset.tab === ui.tab); });
    const body = $('[data-insp]', root);
    if (ui.tab === 'content') renderContent(body);
    else if (ui.tab === 'structure') renderStructure(body);
    else renderDesign(body);
    lockInspector(!!ui.viewing);
  }

  function suggestionsFor(s) {
    const missingInKb = Docs.runChecks(p, ui.kind, st.kb).missing.filter((m) => m.inKb).map((m) => m.keyword);
    const kw = missingInKb[0] || p.brief.keywords[0];
    if (s.kind === 'paragraph') return ['More concise', 'More formal', 'Warmer tone', 'Emphasise ' + kw];
    if (s.kind === 'skills') return ['Emphasise ' + kw, 'Emphasise ' + (p.brief.keywords[1] || 'TypeScript')];
    if (s.kind === 'summary') return ['More concise', 'Emphasise ' + kw, 'Stronger verbs'];
    return ['More concise', 'Emphasise ' + kw, 'Lead with metrics', 'Stronger verbs'];
  }

  function renderContent(body) {
    const s = ui.selected && section(ui.selected);
    if (!s) {
      body.innerHTML = `
        <div class="insp-intro"><h3>${ui.kind === 'resume' ? 'Sections' : 'Paragraphs'}</h3><p class="muted small">Pick one to rewrite it with AI or edit it by hand. You can also click it in the preview.</p></div>
        <div class="section-list">${doc().sections.map((x) => `<button class="section-row ${x.hidden ? 'is-hidden' : ''}" data-pick="${x.id}">
          <span class="sr-title">${esc(x.title)}${x.hidden ? `<span class="pill">Hidden</span>` : ''}</span><span class="sr-sub">${esc(Docs.sectionPlainText(x).slice(0, 80))}</span>${icon('chevRight', 15)}</button>`).join('')}</div>`;
      $$('[data-pick]', body).forEach((b) => (b.onclick = () => selectSection(b.dataset.pick)));
      return;
    }
    const isLetter = s.kind === 'paragraph';
    body.innerHTML = `
      <div class="insp-top">
        <button class="icon-btn" data-all aria-label="All ${isLetter ? 'paragraphs' : 'sections'}" data-tip="All ${isLetter ? 'paragraphs' : 'sections'}">${icon('chevLeft', 16)}</button>
        <h3 class="insp-title" data-insp-title>${esc(s.title)}</h3>
        <button class="icon-btn" data-copy-sec aria-label="Copy text" data-tip="Copy this ${isLetter ? 'paragraph' : 'section'} as plain text">${icon('copy', 15)}</button>
      </div>
      <div class="instruction" data-instr-area></div>
      <fieldset class="manual">
        <legend class="sr-only">Edit by hand</legend>
        <div class="manual-head"><span class="sub-label">Edit by hand</span><span class="muted small">Updates the preview as you type</span></div>
        ${isLetter ? '' : `<div class="field"><label for="sec-title">Section heading</label><input id="sec-title" data-sec-title value="${esc(s.title)}"></div>`}
        <div data-manual></div>
      </fieldset>`;
    $('[data-all]', body).onclick = () => { ui.selected = null; ui.pending = null; renderPreview(); renderInspector(); };
    $('[data-copy-sec]', body).onclick = () => copyText(Docs.sectionCopyText(s), s.title);
    const ti = $('[data-sec-title]', body);
    if (ti) ti.oninput = () => { pushUndo('Edited heading', 'title-' + s.id); s.title = ti.value; $('[data-insp-title]', body).textContent = ti.value; renderPreview(); commit('edit', `Edited ${s.title} heading`, 'title-' + s.id); renderLeft(); };
    renderInstruction(s);
    renderManual(s);
  }

  function renderInstruction(s) {
    const area = $('[data-instr-area]', root);
    if (!area) return;
    // Hand edits wait while a rewrite runs or its proposal is open, so Accept never overwrites them
    const manual = $('.manual', root); if (manual) manual.disabled = !!(ui.busy || (ui.pending && ui.pending.sectionId === s.id));
    if (ui.pending && ui.pending.sectionId === s.id) {
      const pd = ui.pending;
      area.innerHTML = `
        <div class="proposal">
          <div class="proposal-head">${icon('spark', 14)}<div><strong>Proposed change</strong><span class="muted small">"${esc(pd.instruction)}"</span></div></div>
          <div class="diff">${Docs.sectionDiffHtml(pd.before, pd.after)}</div>
          ${pd.warnings.map((w) => `<div class="callout callout-warn small">${icon('alert', 14)}<div>${esc(w)}</div></div>`).join('')}
          <div class="proposal-actions"><button class="btn btn-primary btn-sm" data-accept>${icon('check', 14)} Accept</button><button class="btn btn-ghost btn-sm" data-reject>Reject</button></div>
          <details class="patch"><summary>${pd.ops.length} patch ${pd.ops.length === 1 ? 'operation' : 'operations'}, validated</summary><pre>${esc(JSON.stringify(pd.ops, null, 2))}</pre></details>
        </div>`;
      $('[data-accept]', area).onclick = acceptPending;
      $('[data-reject]', area).onclick = () => { ui.pending = null; renderPreview(); renderInspector(); toast('Change rejected. Nothing was applied.'); };
      return;
    }
    const tokens = Docs.estimateTokens(s);
    area.innerHTML = `
      <label for="instr" class="instr-label">${icon('spark', 14)} Rewrite this ${s.kind === 'paragraph' ? 'paragraph' : 'section'}</label>
      <div class="composer ${ui.busy ? 'is-busy' : ''}">
        <textarea id="instr" rows="2" data-instruction placeholder="e.g. more concise, emphasise GraphQL" ${ui.busy ? 'disabled' : ''}>${esc(ui.instructionDraft)}</textarea>
        <div class="instr-foot">
          <span class="muted small">Sends only this ${s.kind === 'paragraph' ? 'paragraph' : 'section'}, about ${tokens.toLocaleString()} tokens</span>
          <button class="btn btn-primary btn-sm" data-rewrite data-tip="Ctrl+Enter" ${ui.busy ? 'disabled' : ''}>${ui.busy ? '<span class="spinner spinner-light"></span> Rewriting' : 'Rewrite'}</button>
        </div>
      </div>
      <div class="chips instr-chips">${suggestionsFor(s).map((c) => `<button class="chip chip-btn" data-suggest="${esc(c)}" ${ui.busy ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>
      ${ui.busy ? `<div class="working-strip"><span>Rewriting with ${esc(st.activeModel.model)}</span><div class="shimmer"></div></div>` : ''}
      <div class="field-error" data-instr-err hidden></div>`;
    const ta = $('[data-instruction]', area);
    ta.oninput = () => (ui.instructionDraft = ta.value);
    ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runRewrite(s.id); };
    $$('[data-suggest]', area).forEach((c) => (c.onclick = () => { ui.instructionDraft = c.dataset.suggest; ta.value = c.dataset.suggest; runRewrite(s.id); }));
    $('[data-rewrite]', area).onclick = () => runRewrite(s.id);
  }

  async function runRewrite(sectionId) {
    const s = section(sectionId);
    const instruction = ui.instructionDraft.trim();
    if (!instruction) {
      const e = $('[data-instr-err]', root); e.hidden = false; e.textContent = 'Type an instruction first, or pick one of the suggestions.';
      return;
    }
    if (!st.connections[st.activeModel.provider]) { toast('Add an API key in Settings to use rewrites', { kind: 'error' }); return; }
    ui.busy = true;
    renderInstruction(s); renderPreview();
    await sleep(1600 + Math.random() * 1000);
    if (!alive) return;
    ui.busy = false;
    if (ui.selected !== sectionId || !section(sectionId)) { renderInspector(); renderPreview(); return; } // left the section: the rewrite is dropped
    const res = Docs.rewriteSection(s, instruction, st.kb);
    if (!res.changed) {
      renderInstruction(s); renderPreview();
      const e = $('[data-instr-err]', root); e.hidden = false;
      // Suggest an instruction other than the one that just did nothing
      const other = ['emphasise ' + p.brief.keywords[0], 'lead with metrics', 'more concise'].find((x) => x.toLowerCase() !== instruction.toLowerCase());
      e.textContent = `No change suggested for "${instruction}". Try a different instruction, like "${other}".`;
      return;
    }
    const idx = doc().sections.indexOf(s);
    ui.pending = { sectionId, before: clone(s), after: res.section, instruction, warnings: res.warnings, ops: patchOps(idx, s, res.section) };
    renderPreview(); renderInspector();
  }

  function patchOps(idx, before, after) {
    const base = `/sections/${idx}`;
    const ops = [];
    if (before.text !== after.text) ops.push({ op: 'replace', path: base + '/text', value: after.text });
    (after.items || []).forEach((it, k) => {
      const old = before.items[k];
      if (old.id !== it.id) { ops.push({ op: 'replace', path: `${base}/items/${k}`, value: { id: it.id, '…': '' } }); return; }
      if (it.line !== old.line) ops.push({ op: 'replace', path: `${base}/items/${k}/line`, value: it.line });
      (it.bullets || []).forEach((b, j) => {
        const ob = old.bullets[j];
        if (!ob || ob.id !== b.id || ob.text !== b.text) ops.push({ op: 'replace', path: `${base}/items/${k}/bullets/${j}`, value: { id: b.id, text: b.text, source: b.source } });
      });
    });
    return ops;
  }

  function acceptPending() {
    const pd = ui.pending;
    const i = doc().sections.findIndex((x) => x.id === pd.sectionId);
    pushUndo(`Rewrite of ${pd.before.title}`);
    doc().sections[i] = pd.after;
    ui.pending = null; ui.instructionDraft = '';
    commit('rewrite', `Rewrote ${pd.before.title}: "${pd.instruction}"`);
    vt(() => { renderPreview(); renderInspector(); renderLeft(); }, 'accept').then(() => flashSection(pd.sectionId));
    toast('Change applied to ' + pd.before.title, { action: { label: 'Undo', fn: doUndo } });
  }

  function renderManual(s) {
    const wrap = $('[data-manual]', root);
    const area = (val, attrs) => `<textarea class="autogrow" rows="2" ${attrs}>${esc(val)}</textarea>`;
    if (s.text != null) wrap.innerHTML = area(s.text, 'data-path="text"');
    else wrap.innerHTML = s.items.map((it, k) => `
      <div class="item-edit">
        <div class="item-edit-head">
          <input data-path="items.${k}.heading" value="${esc(it.heading)}" aria-label="Heading">
          ${it.sub != null ? `<input data-path="items.${k}.sub" value="${esc(it.sub)}" aria-label="Subheading">` : ''}
          ${it.meta != null ? `<input class="small-input" data-path="items.${k}.meta" value="${esc(it.meta)}" aria-label="Details">` : ''}
        </div>
        ${it.line != null ? area(it.line, `data-path="items.${k}.line"`) : ''}
        ${it.bullets ? `<div class="bullets-edit">${it.bullets.map((b, j) => `<div class="bullet-edit"><span class="bdot"></span>${area(b.text, `data-path="items.${k}.bullets.${j}.text"`)}<button class="icon-btn" data-rm-bullet="${k}.${j}" aria-label="Remove bullet">${icon('x', 13)}</button></div>`).join('')}</div>` : ''}
      </div>`).join('');
    const grow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; };
    $$('textarea.autogrow', wrap).forEach((t) => requestAnimationFrame(() => grow(t)));
    $$('[data-path]', wrap).forEach((el) => (el.oninput = () => {
      if (el.tagName === 'TEXTAREA') grow(el);
      pushUndo(`Edit to ${s.title}`, 'edit-' + s.id);
      const parts = el.dataset.path.split('.');
      let obj = s;
      parts.slice(0, -1).forEach((k) => (obj = obj[isNaN(k) ? k : +k]));
      obj[parts[parts.length - 1]] = el.value;
      renderPreview();
      commit('edit', `Edited ${s.title}`, 'edit-' + s.id);
      renderLeftDebounced();
    }));
    $$('[data-rm-bullet]', wrap).forEach((b) => (b.onclick = () => {
      const [k, j] = b.dataset.rmBullet.split('.').map(Number);
      pushUndo(`Removed a bullet from ${s.title}`);
      s.items[k].bullets.splice(j, 1);
      commit('edit', `Removed a bullet from ${s.title}`);
      renderPreview(); renderManual(s); renderLeft();
    }));
  }
  const renderLeftDebounced = debounce(() => renderLeft(), 250);

  function renderStructure(body) {
    const secs = doc().sections;
    body.innerHTML = `
      <p class="muted small insp-hint">Drag to reorder, or focus a row and press Alt with the up or down arrow. Hidden sections stay in the document.</p>
      <ol class="struct-list" data-struct>${secs.map((s, i) => `
        <li class="struct-row ${s.hidden ? 'is-hidden' : ''}" draggable="true" data-id="${s.id}" tabindex="0" style="view-transition-name:sr-${s.id}" aria-label="${esc(s.title)}, position ${i + 1} of ${secs.length}${s.hidden ? ', hidden' : ''}">
          <span class="grip">${icon('grip', 15)}</span>
          <span class="struct-title">${esc(s.title)}${s.hidden ? '<span class="pill">Hidden</span>' : ''}</span>
          <button class="icon-btn" data-move="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up', 15)}</button>
          <button class="icon-btn" data-move="1" aria-label="Move down" ${i === secs.length - 1 ? 'disabled' : ''}>${icon('down', 15)}</button>
          <button class="icon-btn" data-vis aria-label="${s.hidden ? 'Show' : 'Hide'} ${esc(s.title)}">${icon(s.hidden ? 'eyeOff' : 'eye', 15)}</button>
        </li>`).join('')}</ol>
      <div class="sr-only" aria-live="polite" data-live></div>`;
    const list = $('[data-struct]', body);
    const move = (id, delta, focus) => {
      const i = secs.findIndex((s) => s.id === id);
      const j = i + delta;
      if (j < 0 || j >= secs.length) return;
      pushUndo('Reorder sections');
      const [s] = secs.splice(i, 1); secs.splice(j, 0, s);
      commit('structure', `Moved ${s.title} ${delta < 0 ? 'up' : 'down'}`);
      vt(() => {
        renderPreview(); renderStructure(body);
        $('[data-live]', body).textContent = `${s.title} moved to position ${j + 1}`;
        if (focus) $(`[data-id="${id}"]`, body).focus();
      }, 'reorder').then(() => flashSection(id));
    };
    $$('.struct-row', list).forEach((row) => {
      const id = row.dataset.id;
      $$('[data-move]', row).forEach((b) => (b.onclick = () => move(id, +b.dataset.move)));
      $('[data-vis]', row).onclick = () => {
        const s = section(id);
        pushUndo((s.hidden ? 'Show ' : 'Hide ') + s.title);
        s.hidden = !s.hidden;
        commit('structure', `${s.hidden ? 'Hid' : 'Showed'} ${s.title}`);
        vt(() => { renderPreview(); renderStructure(body); renderLeft(); }, 'reorder');
      };
      row.onkeydown = (e) => { if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); move(id, e.key === 'ArrowUp' ? -1 : 1, true); } };
      row.ondragstart = (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); row.classList.add('dragging'); };
      row.ondragend = () => row.classList.remove('dragging');
      row.ondragover = (e) => {
        e.preventDefault();
        const r = row.getBoundingClientRect();
        $$('.struct-row', list).forEach((x) => x.classList.remove('drop-above', 'drop-below'));
        row.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-above' : 'drop-below');
      };
      row.ondragleave = () => row.classList.remove('drop-above', 'drop-below');
      row.ondrop = (e) => {
        e.preventDefault();
        const from = e.dataTransfer.getData('text/plain');
        if (!from || from === id) return renderStructure(body);
        const above = row.classList.contains('drop-above');
        pushUndo('Reorder sections');
        const fi = secs.findIndex((s) => s.id === from);
        const [s] = secs.splice(fi, 1);
        let ti = secs.findIndex((x) => x.id === id);
        if (!above) ti += 1;
        secs.splice(ti, 0, s);
        commit('structure', `Moved ${s.title}`);
        vt(() => { renderPreview(); renderStructure(body); }, 'reorder').then(() => flashSection(from));
      };
    });
  }

  function renderDesign(body) {
    const t = doc().theme;
    const D = MOCK.themeDefaults;
    const slider = (k, label, min, max, step, unit) => `
      <div class="slider-field">
        <div class="slider-top"><label for="d-${k}">${label}</label><output data-out="${k}">${t[k]}${unit}</output></div>
        <input type="range" id="d-${k}" data-theme-key="${k}" min="${min}" max="${max}" step="${step}" value="${t[k]}" data-unit="${unit}" style="--p:${((t[k] - min) / (max - min)) * 100}%">
      </div>`;
    body.innerHTML = `
      <div class="instant-note">${icon('zap', 14)}<div><strong>Instant, and free.</strong> Design changes go straight to the renderer. No LLM call, no tokens.</div></div>
      <div class="design-group">
        <div class="dg-label">Font</div>
        <div class="font-options">${Object.keys(Docs.FONT_STACKS).map((f) => `
          <label class="font-opt ${t.font === f ? 'on' : ''}"><input type="radio" name="font" value="${f}" ${t.font === f ? 'checked' : ''}>
            <span class="font-sample" style="font-family:${Docs.FONT_STACKS[f]}">Aa</span><span class="font-name">${f}</span></label>`).join('')}</div>
      </div>
      <div class="design-group">
        <div class="dg-label">Sizes</div>
        ${slider('baseSize', 'Body text', 9, 12, 0.5, ' pt')}
        ${slider('headingSize', 'Section headings', 10, 15, 0.5, ' pt')}
        ${slider('nameSize', 'Your name', 16, 30, 1, ' pt')}
      </div>
      <div class="design-group">
        <div class="dg-label">Spacing</div>
        ${slider('margin', 'Page margins', 10, 25, 1, ' mm')}
        ${slider('lineHeight', 'Line spacing', 1.1, 1.7, 0.05, '')}
        ${slider('sectionGap', 'Space between sections', 4, 24, 1, ' pt')}
      </div>
      <div class="design-group">
        <div class="dg-label">Accent colour</div>
        <div class="swatches">${MOCK.accents.map((c) => `<button class="swatch ${t.accent.toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="--c:${c}" data-accent="${c}" aria-label="Accent ${c}"></button>`).join('')}
          <label class="swatch swatch-custom" title="Custom colour"><input type="color" value="${t.accent}" data-accent-custom aria-label="Custom accent colour"></label></div>
      </div>
      <div class="design-foot">
        <button class="btn btn-ghost btn-sm" data-reset ${JSON.stringify(t) === JSON.stringify(D) ? 'disabled' : ''}>${icon('undo', 14)} Reset to template defaults</button>
        <span class="muted small" data-design-ms>Last render ${ui.lastRenderMs} ms</span>
      </div>`;

    const changed = (label) => {
      commit('adjustment', 'Adjusted design', 'design');
      renderPreview({ design: true });
      $('[data-design-ms]', body).textContent = `Last render ${ui.lastRenderMs} ms`;
      $('[data-reset]', body).disabled = JSON.stringify(t) === JSON.stringify(D);
    };
    $$('input[name="font"]', body).forEach((r) => (r.onchange = () => {
      pushUndo('Font change'); t.font = r.value;
      $$('.font-opt', body).forEach((o) => o.classList.toggle('on', $('input', o).checked));
      changed('font');
    }));
    $$('[data-theme-key]', body).forEach((r) => (r.oninput = () => {
      const k = r.dataset.themeKey;
      pushUndo('Design adjustment', 'design-' + k);
      t[k] = +r.value;
      r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
      $(`[data-out="${k}"]`, body).textContent = r.value + r.dataset.unit;
      changed(k);
    }));
    $$('[data-accent]', body).forEach((b) => (b.onclick = () => {
      pushUndo('Accent colour'); t.accent = b.dataset.accent;
      $$('.swatch', body).forEach((x) => x.classList.toggle('on', x === b));
      changed('accent colour');
    }));
    $('[data-accent-custom]', body).oninput = (e) => { pushUndo('Accent colour', 'accent-custom'); t.accent = e.target.value; $$('.swatch', body).forEach((x) => x.classList.remove('on')); changed('accent colour'); };
    $('[data-reset]', body).onclick = () => { pushUndo('Reset design'); p.docs[ui.kind].theme = clone(D); commit('adjustment', 'Reset design to template defaults'); renderPreview({ design: true }); renderDesign(body); };
  }

  /* ---------- History ---------- */
  const REV_ICON = { generation: 'spark', rewrite: 'spark', edit: 'pencil', adjustment: 'palette', structure: 'layers', restore: 'undo' };
  function openHistory() {
    const d = $('[data-drawer]', root);
    renderHistory();
    d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
    $('[data-close-drawer]', d).focus();
  }
  function closeHistory() {
    const d = $('[data-drawer]', root);
    d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
    if (ui.viewing) { ui.viewing = null; renderPreview(); lockInspector(false); }
  }
  function renderHistory() {
    const list = $('[data-revs]', root);
    const revs = [...p.revisions[ui.kind]].reverse();
    $('.drawer-sub', root).textContent = `Every change to the ${kindLabel(ui.kind).toLowerCase()} is saved here automatically. Select one to preview it.`;
    list.innerHTML = revs.map((r, i) => `
      <li><button class="rev ${ui.viewing && ui.viewing.id === r.id ? 'on' : ''} ${!ui.viewing && i === 0 ? 'current' : ''}" data-rev="${r.id}">
        <span class="rev-icon rev-${r.kind}">${icon(REV_ICON[r.kind] || 'pencil', 14)}</span>
        <span class="rev-main"><span class="rev-label">${esc(r.label)}</span><span class="muted small">${esc(clockTime(r.ts))}${r.kind === 'generation' || r.kind === 'rewrite' ? ', used the LLM' : ''}</span></span>
        ${i === 0 ? '<span class="pill">Current</span>' : ''}
      </button></li>`).join('');
    $$('[data-rev]', list).forEach((b) => (b.onclick = () => {
      const r = p.revisions[ui.kind].find((x) => x.id === b.dataset.rev);
      const isCurrent = r === p.revisions[ui.kind][p.revisions[ui.kind].length - 1];
      ui.viewing = isCurrent ? null : r;
      ui.pending = null;
      renderPreview(); lockInspector(!!ui.viewing); renderHistory();
    }));
  }
  function restoreRevision(r) {
    pushUndo('Restore revision');
    p.docs[ui.kind] = clone(r.snapshot);
    ui.viewing = null; ui.selected = null;
    commit('restore', `Restored the version from ${clockTime(r.ts)}`);
    renderPreview(); renderInspector(); renderLeft(); renderHistory();
    toast('Restored. The version you replaced is still in history.');
  }

  /* ---------- Regenerate ---------- */
  function regenerate() {
    openModal({
      title: 'Regenerate both documents?',
      body: `<p>This replaces the resume and cover letter with a fresh generation from the job brief, using about 7,500 tokens on ${esc(st.activeModel.model)}.</p><p class="muted">Your current versions stay in history, so you can restore them.</p>
        <p class="muted small">For small changes, rewriting one section is quicker and cheaper.</p>`,
      actions: [{ label: 'Cancel' }, { label: 'Regenerate', kind: 'btn-primary', fn: async () => {
        $('[data-sheet]', root).classList.add('regenerating');
        toast('Regenerating with ' + st.activeModel.model + '…');
        await sleep(3200);
        if (!alive) return;
        const fresh = Docs.createProject(st.kb, p.jdText, p.brief, p.selected, Date.now(), p.notes || '');
        ['resume', 'coverLetter'].forEach((k) => {
          undo[k].push({ label: 'Regenerate', snapshot: clone(p.docs[k]) });
          fresh.docs[k].theme = p.docs[k].theme;
          p.docs[k] = fresh.docs[k];
          p.revisions[k].push({ id: uid('r'), ts: Date.now(), kind: 'generation', label: 'Regenerated from job brief', snapshot: clone(p.docs[k]) });
        });
        p.updatedAt = Date.now(); Store.save();
        ui.selected = null; ui.pending = null;
        $('[data-sheet]', root).classList.remove('regenerating');
        renderPreview(); renderInspector(); renderLeft(); updateUndoBtn();
        toast('Both documents regenerated');
      } }],
    });
  }

  /* ---------- Export ---------- */
  function openExport() {
    const names = { resume: Docs.fileName(st.kb, 'resume', p.company), coverLetter: Docs.fileName(st.kb, 'coverLetter', p.company) };
    const ch = Docs.runChecks(p, 'resume', st.kb).findings.length + Docs.runChecks(p, 'coverLetter', st.kb).findings.length;
    openModal({
      title: 'Export PDF',
      body: `
        ${ch ? `<div class="callout callout-warn small">${icon('alert', 14)}<div>Checks found ${ch} ${ch === 1 ? 'issue' : 'issues'} across both documents. You can still export.</div></div>` : ''}
        <label class="export-opt"><input type="checkbox" value="resume" ${ui.kind === 'resume' ? 'checked' : ''}><span>${icon('file', 16)}</span><span><strong>Resume</strong><br><code>${esc(names.resume)}</code></span></label>
        <label class="export-opt"><input type="checkbox" value="coverLetter" ${ui.kind === 'coverLetter' ? 'checked' : ''}><span>${icon('file', 16)}</span><span><strong>Cover letter</strong><br><code>${esc(names.coverLetter)}</code></span></label>
        <p class="muted small">${esc(st.prefs.paper)}, single column, selectable text in reading order. In this mock your browser's print dialog opens; choose "Save as PDF". The real app writes the file directly.</p>`,
      actions: [{ label: 'Cancel' }, { label: 'Export PDF', kind: 'btn-primary', fn: (r) => {
        const kinds = $$('.export-opt input:checked', r).map((x) => x.value);
        if (!kinds.length) { toast('Choose at least one document', { kind: 'error' }); return false; }
        const btn = $('.modal-foot .btn-primary', r);
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-light"></span> Compiling with Typst';
        setTimeout(() => {
          const pr = $('#print-root');
          pr.innerHTML = kinds.map((k) => `<div class="sheet print-sheet paper-${st.prefs.paper.toLowerCase()}">${k === 'resume' ? Docs.renderResume(p.docs[k], st.kb) : Docs.renderCoverLetter(p.docs[k], st.kb, p.brief)}</div>`).join('');
          const oldTitle = document.title;
          document.title = names[kinds[0]].replace(/\.pdf$/, '');
          $('#modal-root').innerHTML = '';
          if (!window.__noPrint) window.print();
          document.title = oldTitle;
          toast('Exported ' + kinds.map((k) => names[k]).join(' and '));
        }, 900);
        return false;
      } }],
    });
  }

  renderAll();
  return () => {
    alive = false;
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    Store.saveNow();
  };
};

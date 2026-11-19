/* Quick generate: paste a job description, get finished documents with no manual tweaking.
   Progress is driven by a mock event emitter (createMockPipeline) so the UI can later listen to real
   pipeline events instead. Animation styles for these screens are scoped under .qg-* in styles.css. */

/* ---------- Mock scenario (?mock=happy|gaps|findings|error-stage-N) ---------- */
function quickScenario() {
  const fromSearch = new URLSearchParams(location.search).get('mock');
  const fromHash = new URLSearchParams(location.hash.split('?')[1] || '').get('mock');
  const s = fromSearch || fromHash || Store.state.demo.quickScenario || 'happy';
  return ['happy', 'gaps', 'findings'].includes(s) || /^error-stage-[1-5]$/.test(s) ? s : 'happy';
}

function quickPrefs() {
  const prefs = Store.state.prefs;
  if (!prefs.quick) prefs.quick = { theme: 'classic', pages: 1, coverLetter: true, tone: 'Professional' };
  return prefs.quick;
}

function quickStages(prefs) {
  return [
    { id: 'read', label: 'Reading the job description' },
    { id: 'match', label: 'Matching your experience' },
    { id: 'write', label: prefs.coverLetter ? 'Writing your resume and cover letter' : 'Writing your resume' },
    { id: 'fit', label: `Fitting to ${prefs.pages} ${prefs.pages === 1 ? 'page' : 'pages'}` },
    { id: 'check', label: 'Running checks' },
  ];
}

function inferSeniority(title) {
  if (/principal|staff|lead|head/i.test(title)) return 'Lead';
  if (/senior|\bsr\b/i.test(title)) return 'Senior';
  if (/junior|graduate|grad\b|intern/i.test(title)) return 'Junior';
  return 'Mid-level';
}

// Theme, page budget and tone from Settings, applied to a freshly generated project
function applyQuickPrefs(p, prefs) {
  const { label, ...theme } = MOCK.themePresets[prefs.theme] || MOCK.themePresets.classic;
  p.docs.resume.theme = clone(theme);
  p.docs.coverLetter.theme = clone(theme);
  if (prefs.pages === 1) p.docs.resume.sections.forEach((s) => { if (['portfolio', 'credentials', 'referees'].includes(s.kind)) s.hidden = true; });
  if (prefs.tone !== 'Professional') {
    const instruction = prefs.tone === 'Warm' ? 'warmer' : 'more concise';
    p.docs.coverLetter.sections = p.docs.coverLetter.sections.map((s) => Docs.rewriteSection(s, instruction, Store.state.kb).section);
  }
  p.source = 'quick';
  p.coverLetterOff = !prefs.coverLetter;
  p.revisions.resume[0].snapshot = clone(p.docs.resume);
  p.revisions.coverLetter[0].snapshot = clone(p.docs.coverLetter);
}

/* ---------- Mock pipeline (event emitter) ----------
   Events: stage {index, id, label, status: active|done|warning|error, note}
           progress {value 0..1}, brief, match, draft, pages, checks, done, error */
const PIPELINE_CANCELLED = Symbol('cancelled');

// Gaps the "gaps" scenario adds: [requirement, keyword]. A gap clears once the KB has evidence for its keyword.
const SCENARIO_GAPS = [['Payments or financial services experience', 'Payments'], ['Kubernetes in production', 'Kubernetes']];

function createMockPipeline({ jdText, notes = '', scenario, prefs }) {
  const st = Store.state;
  const kb = st.kb;
  const stages = quickStages(prefs);
  const handlers = {};
  const pending = new Set();
  const ctx = {}; // partial results, kept so "Retry from this step" can resume
  let cancelled = false;
  let failAt = scenario.startsWith('error-stage-') ? +scenario.slice(-1) - 1 : -1;

  const emit = (type, data) => (handlers[type] || []).forEach((fn) => fn(data));
  const wait = (ms) => new Promise((resolve, reject) => {
    if (cancelled) return reject(PIPELINE_CANCELLED);
    const w = { reject, t: setTimeout(() => { pending.delete(w); resolve(); }, ms) };
    pending.add(w);
  });
  const stageMs = () => 2000 + Math.random() * 1600; // 2 to 3.6s per stage
  async function advance(i, from, to, ms, steps = 6) {
    for (let k = 1; k <= steps; k++) {
      await wait(ms / steps);
      emit('progress', { value: (i + from + (to - from) * (k / steps)) / stages.length });
    }
  }
  function maybeFail(i) {
    if (i !== failAt) return;
    failAt = -1; // fail once, so "Retry from this step" succeeds
    const prov = (MOCK.providers.find((p) => p.id === st.activeModel.provider) || {}).name || 'The provider';
    throw new Error({
      read: "The text couldn't be read as a job description. Check you pasted the whole ad as plain text.",
      match: "Your knowledge base couldn't be loaded from the local database.",
      write: `${prov} returned 529 overloaded_error. The model is busy right now.`,
      fit: 'The renderer stopped while laying out page 2.',
      check: 'Checks stopped before they finished.',
    }[stages[i].id]);
  }

  const work = {
    async read(i, ms) {
      await advance(i, 0, 0.6, ms * 0.6);
      maybeFail(i);
      const brief = Docs.extractBrief(jdText);
      brief.seniority = brief.seniority || inferSeniority(brief.title);
      ctx.gaps = [];
      if (scenario === 'gaps') {
        brief.requirements = brief.requirements.slice(0, 4).concat(SCENARIO_GAPS.map(([r]) => r));
        brief.keywords = brief.keywords.concat(SCENARIO_GAPS.map(([, k]) => k));
        ctx.gaps = SCENARIO_GAPS.filter(([, k]) => !Docs.kwMatch(Docs.kbAllText(kb), k)).map(([r]) => r); // notes can't fill a gap: bullets need KB highlights
      }
      ctx.brief = brief;
      emit('brief', brief);
      await advance(i, 0.6, 1, ms * 0.4);
      return { note: `${brief.requirements.length} must-haves, ${brief.keywords.length} keywords` };
    },
    async match(i, ms) {
      await advance(i, 0, 0.5, ms * 0.5);
      maybeFail(i);
      const b = ctx.brief;
      ctx.selected = Docs.suggestSelection(kb, b);
      const entries = [...kb.roles, ...(kb.volunteering || []), ...kb.portfolio, ...kb.credentials]
        .filter((e) => ctx.selected.includes(e.id) && Docs.matchedKeywords(Docs.entryText(e), b.keywords).length);
      const matched = entries.map((e) => (e.company ? `${e.title}, ${e.company}` : e.name || e.title)).slice(0, 4);
      const skills = kb.skills.flatMap((g) => g.items).filter((s) => b.keywords.some((k) => Docs.kwMatch(s, k))).slice(0, 5);
      emit('match', { matched, skills, gaps: ctx.gaps });
      await advance(i, 0.5, 1, ms * 0.5);
      return ctx.gaps.length
        ? { status: 'warning', note: `${ctx.gaps.length} must-haves have no evidence in your knowledge base` }
        : { note: `${matched.length} entries and ${skills.length} skills match` };
    },
    async write(i, ms) {
      const p = Docs.createProject(kb, jdText, clone(ctx.brief), ctx.selected, Date.now(), notes);
      applyQuickPrefs(p, prefs);
      if (scenario === 'findings') Docs.applyDemoFlaws(p);
      ctx.project = p;
      const exp = p.docs.resume.sections.find((s) => s.kind === 'experience'); // undefined for education-only backgrounds
      const pieces = [
        { kind: 'summary', text: p.docs.resume.sections[0].text },
        ...(exp?.items[0]?.bullets || []).slice(0, 4).map((b) => ({ kind: 'bullet', text: b.text })),
      ];
      if (prefs.coverLetter) pieces.push({ kind: 'letter', text: p.docs.coverLetter.sections[0].text });
      const n = pieces.length + 1;
      for (let k = 0; k < pieces.length; k++) {
        await advance(i, k / n, (k + 1) / n, ms / n, 2);
        if (k === 2) maybeFail(i);
        emit('draft', pieces[k]);
      }
      await advance(i, (n - 1) / n, 1, ms / n, 2);
      return {};
    },
    async fit(i, ms) {
      const n = prefs.pages;
      const unit = (v) => (v === 1 ? 'page' : 'pages');
      const steps = [
        [n + 0.3, 'Measuring the first draft'],
        [n + 0.2, 'Tightening line spacing'],
        [n + 0.1, 'Shortening the summary'],
        [n, `Fits on ${n} ${unit(n)}`],
      ];
      for (let k = 0; k < steps.length; k++) {
        await advance(i, k / steps.length, (k + 1) / steps.length, ms / steps.length, 2);
        if (k === 1) maybeFail(i);
        emit('pages', { value: steps[k][0], action: steps[k][1], done: k === steps.length - 1, budget: n });
      }
      return { note: `Resume ${n} ${unit(n)}${prefs.coverLetter ? ', cover letter 1 page' : ''}` };
    },
    async check(i, ms) {
      await advance(i, 0, 0.7, ms * 0.7);
      maybeFail(i);
      const p = ctx.project;
      const r = Docs.runChecks(p, 'resume', kb);
      const c = prefs.coverLetter ? Docs.runChecks(p, 'coverLetter', kb) : { findings: [] };
      const coverage = Math.round((r.matched.length / Math.max(1, p.brief.keywords.length)) * 100);
      const findings = [
        ...r.findings.map((f) => ({ ...f, doc: 'Resume' })),
        ...c.findings.map((f) => ({ ...f, doc: 'Cover letter' })),
      ];
      if (coverage < 60) {
        findings.push({ type: 'coverage', doc: 'Resume', title: `Keyword coverage is ${coverage}%`, detail: `${r.missing.slice(0, 3).map((m) => m.keyword).join(', ')} from the job brief don't appear in the resume.` });
      }
      ctx.summary = { coverage, findings, gaps: ctx.gaps };
      emit('checks', ctx.summary);
      await advance(i, 0.7, 1, ms * 0.3);
      return findings.length
        ? { status: 'warning', note: `${findings.length} ${findings.length === 1 ? 'finding' : 'findings'} to review` }
        : { note: ctx.gaps.length ? 'No findings' : 'No issues found' };
    },
  };

  async function run(from = 0) {
    cancelled = false;
    for (let i = from; i < stages.length; i++) {
      const s = stages[i];
      emit('stage', { index: i, id: s.id, label: s.label, status: 'active' });
      try {
        const res = await work[s.id](i, stageMs());
        emit('stage', { index: i, id: s.id, label: s.label, status: res.status || 'done', note: res.note || '' });
      } catch (e) {
        if (e === PIPELINE_CANCELLED) return;
        emit('stage', { index: i, id: s.id, label: s.label, status: 'error', note: e.message });
        emit('error', { index: i, label: s.label, reason: e.message });
        return;
      }
    }
    emit('done', { project: ctx.project, summary: ctx.summary, brief: ctx.brief });
  }

  return {
    stages,
    on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); return this; },
    run,
    cancel() { cancelled = true; pending.forEach((w) => { clearTimeout(w.t); w.reject(PIPELINE_CANCELLED); }); pending.clear(); },
  };
}

/* ---------- Screens ---------- */
// One-line explanations for the result screen; Studio shows the full detail
const FINDING_LINE = {
  banned: 'Reads as generic or AI-written. Reword it in Studio.',
  grounding: "Not backed by a fact in your knowledge base. Fix it in Studio or add the fact.",
};

function quickView(root) {
  const st = Store.state;
  const prefs = quickPrefs();
  if (!st.quickDraft) st.quickDraft = { jdText: '', notes: '' };
  const qd = st.quickDraft;
  let pipeline = null;
  let timer = null;
  let startedAt = 0;
  let replaceProjectId = null;

  const hasConn = () => !!st.connections[st.activeModel.provider];
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const crumbs = `<a class="crumb" href="#/dashboard">${icon('chevLeft', 15)} Applications</a><span class="crumb-sep">/</span><a class="crumb" href="#/new">New application</a><span class="crumb-sep">/</span><span>Quick generate</span>`;
  const elapsed = () => ((performance.now() - startedAt) / 1000).toFixed(1);

  function frame(inner) {
    root.innerHTML = shell(`<div class="qg-wrap">${inner}</div><div class="sr-only" aria-live="polite" data-announce></div>`, { route: 'dashboard', title: crumbs });
    bindShell(root);
  }
  function announce(msg) {
    const el = $('[data-announce]', root);
    if (!el) return;
    el.textContent = '';
    setTimeout(() => (el.textContent = msg), 40);
  }
  function stopTimer() { clearInterval(timer); timer = null; }

  /* 1. Job description input */
  function renderInput() {
    const themeLabel = (MOCK.themePresets[prefs.theme] || MOCK.themePresets.classic).label;
    const scenario = quickScenario();
    frame(`
      <section class="panel qg-input">
        <h1>Paste a job description</h1>
        <p class="muted">You'll get a tailored resume${prefs.coverLetter ? ' and cover letter' : ''}, written only from facts in your knowledge base.</p>
        ${!hasConn() ? `<div class="callout callout-warn">${icon('key', 16)}<div><strong>No API key connected.</strong> Generation runs on your own provider account. <a href="#/settings">Add a key in Settings</a></div></div>` : ''}
        <textarea class="jd-input" data-jd aria-label="Job description" placeholder="Paste the whole job ad here, including the requirements">${esc(qd.jdText)}</textarea>
        <div class="field-error" data-err hidden></div>
        <div class="field notes-field"><label for="qg-notes">Notes for this application <span class="optional">optional</span></label>
          <textarea id="qg-notes" rows="2" data-notes placeholder="Why you want this job, what to emphasise, who referred you">${esc(qd.notes || '')}</textarea>
          <span class="muted small">Used as a fact you supplied, mostly in the cover letter. Nothing else is added.</span></div>
        <div class="qg-input-foot">
          <span class="muted small" data-count></span>
          <div class="row-gap">
            <button class="btn btn-ghost" data-sample>Use sample job description</button>
            <button class="btn btn-primary" data-go>${icon('spark')} Generate</button>
          </div>
        </div>
        <p class="qg-note">${icon('zap', 13)} Uses your knowledge base and default theme. You can tweak everything afterwards.</p>
        <p class="muted small qg-defaults">Defaults: ${esc(themeLabel)} theme, ${plural(prefs.pages, 'page', 'pages')}, ${prefs.coverLetter ? `cover letter on (${prefs.tone.toLowerCase()} tone)` : 'cover letter off'}. <a href="#/settings">Change defaults</a></p>
      </section>
      <p class="muted small qg-mock-note">${icon('flask', 13)} Mock scenario: <strong>${esc(scenario)}</strong>. Change it in Demo controls, or add <code>?mock=gaps</code>, <code>?mock=findings</code> or <code>?mock=error-stage-3</code> to the URL.</p>`);
    const ta = $('[data-jd]', root);
    const go = $('[data-go]', root);
    const sync = () => {
      qd.jdText = ta.value;
      $('[data-count]', root).textContent = ta.value.length.toLocaleString() + ' characters';
      go.disabled = !ta.value.trim() || !hasConn();
      $('[data-err]', root).hidden = true;
      Store.save();
    };
    ta.oninput = sync;
    $('[data-notes]', root).oninput = (e) => { qd.notes = e.target.value; Store.save(); };
    sync();
    $('[data-sample]', root).onclick = () => { qd.jobId = null; ta.value = MOCK.jds.find((j) => j.id === 'jd-mintleaf').text; sync(); ta.focus(); };
    go.onclick = () => {
      if (qd.jdText.trim().length < 80) {
        const e = $('[data-err]', root);
        e.hidden = false;
        e.textContent = 'That looks too short to be a full job description. Paste the whole ad, including the requirements.';
        return;
      }
      start();
    };
  }

  /* 2. Progress */
  function renderProgress(stages) {
    frame(`
      <section class="panel qg-progress" aria-labelledby="qg-title">
        <div class="qg-head">
          <div><h1 id="qg-title" data-title>Generating your documents</h1><p class="muted small">This usually takes about 15 seconds.</p></div>
          <button class="btn btn-ghost btn-sm" data-cancel>Cancel</button>
        </div>
        <div class="qg-overall">
          <div class="bar" role="progressbar" aria-label="Overall progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-bar><div class="bar-fill qg-fill" data-fill></div></div>
          <span class="small qg-pct" data-pct>0%</span>
          <span class="muted small qg-elapsed" data-elapsed>0.0s</span>
        </div>
        <div class="qg-grid">
          <div>
            <ol class="qg-stages">${stages.map((s, i) => `
              <li class="qg-stage is-pending" data-stage="${i}">
                <span class="qg-ic" data-ic aria-hidden="true"><span class="qg-dot"></span></span>
                <span class="qg-stage-text"><span class="qg-label">${esc(s.label)}</span><span class="sr-only" data-state>Not started</span><span class="qg-stage-note" data-note></span></span>
              </li>`).join('')}</ol>
            <div data-error></div>
          </div>
          <div class="qg-live" data-results><p class="muted small qg-live-empty">Results appear here as each step finishes.</p></div>
        </div>
      </section>`);
    $('[data-cancel]', root).onclick = cancel;
  }

  const STAGE_ICON = {
    active: '<span class="spinner"></span>',
    done: icon('check', 13),
    warning: icon('alert', 13),
    error: icon('x', 13),
  };
  const STATE_WORD = { active: 'In progress', done: 'Done', warning: 'Needs review', error: 'Failed' };

  function setStage({ index, label, status, note }) {
    const li = $(`[data-stage="${index}"]`, root);
    if (!li) return;
    li.className = 'qg-stage is-' + status;
    $('[data-ic]', li).innerHTML = STAGE_ICON[status] || '<span class="qg-dot"></span>';
    $('[data-state]', li).textContent = STATE_WORD[status] || 'Not started';
    const n = $('[data-note]', li);
    n.textContent = note || '';
    n.classList.toggle('show', !!note);
    if (status === 'active') announce(label);
    else announce(`${STATE_WORD[status]}: ${label}${note ? '. ' + note : ''}`);
  }

  function addCard(key, title, ic, body) {
    const wrap = $('[data-results]', root);
    $('.qg-live-empty', wrap)?.remove();
    let card = $(`[data-card="${key}"]`, wrap);
    if (card) return card;
    card = document.createElement('div');
    card.className = 'qg-card qg-enter';
    card.dataset.card = key;
    card.innerHTML = `<div class="qg-card-head">${icon(ic, 14)} ${esc(title)}</div>${body}`;
    wrap.appendChild(card);
    card.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    return card;
  }

  function bindPipeline(p) {
    p.on('stage', setStage);
    p.on('progress', ({ value }) => {
      const pct = Math.min(100, Math.round(value * 100));
      const fill = $('[data-fill]', root);
      if (!fill) return;
      fill.style.width = pct + '%';
      $('[data-bar]', root).setAttribute('aria-valuenow', pct);
      $('[data-pct]', root).textContent = pct + '%';
    });
    p.on('brief', (b) => {
      $('[data-title]', root).textContent = `Generating for ${b.title} at ${b.company}`;
      addCard('brief', 'Job brief', 'briefcase', `
        <div class="qg-brief">
          <strong>${esc(b.title)}</strong>
          <span class="muted">${esc(b.company)}, ${esc(b.location)}</span>
          <span class="pill">${esc(b.seniority)}</span>
        </div>
        <div class="qg-sub">Must-haves</div>
        <div class="chips">${b.requirements.slice(0, 6).map((r, k) => `<span class="chip qg-chip" style="--i:${k}" data-req="${esc(r)}">${esc(r)}</span>`).join('')}</div>`);
    });
    p.on('match', ({ matched, skills, gaps }) => {
      $$('[data-req]', root).forEach((chip) => {
        const isGap = gaps.includes(chip.dataset.req);
        chip.classList.add(isGap ? 'chip-gap' : 'chip-ok');
        chip.insertAdjacentHTML('afterbegin', isGap ? `${icon('alert', 12)}<span class="sr-only">Gap: </span>` : `${icon('check', 12)}<span class="sr-only">Matched: </span>`);
      });
      addCard('match', 'Matched from your knowledge base', 'book', `
        <div class="chips">${[...matched, ...skills].map((m, k) => `<span class="chip chip-ok qg-chip" style="--i:${k}">${icon('check', 12)}${esc(m)}</span>`).join('')}</div>
        ${gaps.length ? `<div class="qg-sub qg-sub-warn">${icon('alert', 13)} ${plural(gaps.length, 'gap', 'gaps')}: no supporting evidence</div>
          <div class="chips">${gaps.map((g, k) => `<span class="chip chip-gap qg-chip" style="--i:${k + matched.length + skills.length}">${icon('alert', 12)}<span class="sr-only">Gap: </span>${esc(g)}</span>`).join('')}</div>
          <p class="muted small qg-gap-note">These are flagged on the result, not blocking. You can still download.</p>` : ''}`);
    });
    p.on('draft', (piece) => {
      const card = addCard('draft', 'Draft', 'pencil', `
        <div class="qg-mini" aria-label="Draft preview">
          <div class="qg-mini-name">${esc(st.kb.contact.name)}</div>
          <div class="qg-mini-h">Summary</div><p data-sum></p>
          <div class="qg-mini-h" data-exp-h hidden>Experience</div><ul data-bul></ul>
          <div data-letter></div>
        </div>`);
      if (piece.kind === 'summary') { const el = $('[data-sum]', card); el.textContent = piece.text; el.classList.add('qg-enter'); }
      if (piece.kind === 'bullet') {
        $('[data-exp-h]', card).hidden = false;
        const li = document.createElement('li');
        li.className = 'qg-enter';
        li.textContent = piece.text;
        $('[data-bul]', card).appendChild(li);
      }
      if (piece.kind === 'letter') $('[data-letter]', card).innerHTML = `<div class="qg-mini-h qg-enter">Cover letter</div><p class="qg-enter">${esc(piece.text)}</p>`;
    });
    p.on('pages', ({ value, action, done, budget }) => {
      const card = addCard('pages', 'Page fit', 'file', `
        <div class="qg-pages"><span class="qg-pages-num" data-num></span><span class="qg-pages-unit" data-unit></span><span class="qg-pages-ok" data-ok hidden>${icon('check', 16)}</span></div>
        <div class="muted small" data-act></div>`);
      const num = $('[data-num]', card);
      num.textContent = done ? String(budget) : value.toFixed(1);
      num.classList.remove('tick'); void num.offsetWidth; num.classList.add('tick');
      $('[data-unit]', card).textContent = done && budget === 1 ? 'page' : 'pages';
      $('[data-act]', card).textContent = action;
      $('[data-ok]', card).hidden = !done;
      card.classList.toggle('is-done', done);
    });
    p.on('checks', ({ coverage, findings, gaps }) => {
      addCard('checks', 'Checks', 'shield', `
        <div class="qg-check-row">
          <span><strong>${coverage}%</strong> keyword coverage</span>
          <span class="${gaps.length ? 'warn' : ''}">${icon(gaps.length ? 'alert' : 'check', 13)} ${plural(gaps.length, 'gap', 'gaps')}</span>
          <span class="${findings.length ? 'warn' : ''}">${icon(findings.length ? 'alert' : 'check', 13)} ${plural(findings.length, 'finding', 'findings')}</span>
        </div>`);
    });
    p.on('error', ({ index, label, reason }) => {
      stopTimer();
      $('[data-error]', root).innerHTML = `
        <div class="callout callout-error qg-enter" role="alert">
          ${icon('alert', 16)}
          <div>
            <strong>Stopped at "${esc(label)}"</strong>
            <p>${esc(reason)} The steps before this one are kept.</p>
            <div class="row-gap"><button class="btn btn-primary btn-sm" data-retry>Retry from this step</button><button class="btn btn-ghost btn-sm" data-restart>Start over</button></div>
          </div>
        </div>`;
      $('[data-retry]', root).onclick = () => retryFrom(index);
      $('[data-restart]', root).onclick = () => { pipeline = null; renderInput(); };
      $('[data-retry]', root).focus();
    });
    p.on('done', async (res) => {
      stopTimer();
      const secs = elapsed();
      if (replaceProjectId) { st.projects = st.projects.filter((x) => x.id !== replaceProjectId); replaceProjectId = null; }
      res.project.updatedAt = Date.now();
      st.projects.push(res.project);
      Store.saveNow();
      announce('Your documents are ready');
      await sleep(reducedMotion() ? 0 : 450);
      if (pipeline === p) renderResult(res, secs);
    });
  }

  function start() {
    pipeline = createMockPipeline({ jdText: qd.jdText, notes: qd.notes || '', scenario: quickScenario(), prefs });
    renderProgress(pipeline.stages);
    bindPipeline(pipeline);
    startedAt = performance.now();
    timer = setInterval(() => { const el = $('[data-elapsed]', root); if (el) el.textContent = elapsed() + 's'; }, 100);
    pipeline.run(0);
  }

  // Live-result cards produced by each stage; cleared when retrying that stage
  const STAGE_CARD = { read: 'brief', match: 'match', write: 'draft', fit: 'pages', check: 'checks' };

  function retryFrom(index) {
    $('[data-error]', root).innerHTML = '';
    pipeline.stages.slice(index).forEach((s) => $(`[data-card="${STAGE_CARD[s.id]}"]`, root)?.remove());
    timer = setInterval(() => { const el = $('[data-elapsed]', root); if (el) el.textContent = elapsed() + 's'; }, 100);
    pipeline.run(index);
  }

  function cancel() {
    if (pipeline) pipeline.cancel();
    pipeline = null;
    stopTimer();
    renderInput();
    toast('Generation cancelled. Your job description is still here.');
  }

  /* 3. Result */
  function renderResult({ project: p, summary }, secs) {
    const kinds = p.coverLetterOff ? ['resume'] : ['resume', 'coverLetter'];
    const label = { resume: 'Resume', coverLetter: 'Cover letter' };
    const names = { resume: Docs.fileName(st.kb, 'resume', p.company), coverLetter: Docs.fileName(st.kb, 'coverLetter', p.company) };
    const pages = { resume: prefs.pages, coverLetter: 1 };
    const issues = [
      ...summary.gaps.map((g) => ({ kind: 'gap', title: g, keyword: (SCENARIO_GAPS.find(([r]) => r === g) || [g, g])[1], detail: "Nothing in your knowledge base backs this up. Add it if it's true, then regenerate." })),
      ...summary.findings.map((f) => ({ kind: 'finding', title: f.title, detail: `${f.doc}. ${FINDING_LINE[f.type] || f.detail}` })),
    ];
    const stat = (n, word, warn, extra = '') => `
      <div class="qg-stat ${warn ? 'warn' : 'ok'}">
        <span class="qg-stat-ic">${icon(warn ? 'alert' : 'check', 15)}</span>
        <span><strong>${n}${extra}</strong> ${word}</span>
      </div>`;
    frame(`
      <section class="qg-result">
        <div class="qg-result-head">
          <div>
            <h1 tabindex="-1" data-result-h>${kinds.length > 1 ? 'Your documents are ready' : 'Your resume is ready'}</h1>
            <p class="muted">${esc(p.role)} at ${esc(p.company)}. Generated in ${secs}s with ${esc(st.activeModel.model)}.</p>
          </div>
          <div class="qg-actions">
            <button class="link-btn qg-regen" data-regen>${icon('undo', 14)} Regenerate</button>
            <a class="btn btn-ghost" href="#/project/${p.id}">${icon('pencil', 15)} Open in Studio</a>
            <button class="btn btn-primary" data-dl-all>${icon('download', 15)} ${kinds.length > 1 ? 'Download both' : 'Download resume'}</button>
          </div>
        </div>
        <div class="qg-summary">
          ${stat(summary.coverage, 'keyword coverage', summary.coverage < 60, '%')}
          ${stat(summary.gaps.length, summary.gaps.length === 1 ? 'gap' : 'gaps', summary.gaps.length > 0)}
          ${stat(summary.findings.length, summary.findings.length === 1 ? 'finding' : 'findings', summary.findings.length > 0)}
        </div>
        <div class="qg-docs">${kinds.map((k, i) => `
          <figure class="qg-doc qg-enter" style="--i:${i}">
            <div class="qg-thumb" aria-hidden="true">
              <div class="qg-thumb-scale"><div class="sheet">${k === 'resume' ? Docs.renderResume(p.docs.resume, st.kb) : Docs.renderCoverLetter(p.docs.coverLetter, st.kb, p.brief)}</div></div>
              <span class="qg-thumb-badge">${plural(pages[k], 'page', 'pages')}</span>
            </div>
            <figcaption>
              <span class="qg-doc-meta"><strong>${label[k]}</strong><code>${esc(names[k])}</code></span>
              <span class="row-gap"><button class="btn btn-ghost btn-sm" data-copy="${k}" aria-label="Copy ${label[k].toLowerCase()} as plain text">${icon('copy', 14)} Copy text</button><button class="btn btn-ghost btn-sm" data-dl="${k}" aria-label="Download ${label[k].toLowerCase()}">${icon('download', 14)} Download</button></span>
            </figcaption>
          </figure>`).join('')}
        </div>
        ${issues.length ? `
          <details class="qg-issues" open>
            <summary><span>${plural(issues.length, 'item', 'items')} to review before you send</span><span class="muted small">Downloads aren't blocked</span></summary>
            <ul>${issues.map((it, i) => `
              <li class="qg-issue qg-issue-${it.kind}" data-issue="${i}">
                <span class="qg-issue-ic">${icon('alert', 14)}</span>
                <span><span class="qg-issue-tag">${it.kind === 'gap' ? 'Gap' : 'Finding'}</span> <strong>${esc(it.title)}</strong><span class="qg-issue-detail">${esc(it.detail)}</span></span>
                ${it.kind === 'gap' ? `<button class="btn btn-ghost btn-sm qg-issue-act" data-add-gap="${i}">${icon('plus', 14)} Add to knowledge base</button>` : ''}
              </li>`).join('')}</ul>
            <p class="muted small qg-issues-foot">Fix findings in <a href="#/project/${p.id}">Studio</a>, or add missing experience to your <a href="#/kb/roles">knowledge base</a> and regenerate.</p>
          </details>` : `<div class="qg-clean">${icon('check', 15)} No gaps or findings. Ready to send.</div>`}
      </section>`);
    $('[data-result-h]', root).focus();

    const download = async (btn, ks) => {
      const html = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner ${btn.classList.contains('btn-primary') ? 'spinner-light' : ''}"></span> Preparing`;
      await sleep(700);
      btn.innerHTML = `${icon('check', 14)} Downloaded`;
      toast(`Downloaded ${ks.map((k) => names[k]).join(' and ')} (mock, no file saved)`);
      setTimeout(() => { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = html; } }, 2200);
    };
    $('[data-dl-all]', root).onclick = (e) => download(e.currentTarget, kinds);
    $$('[data-dl]', root).forEach((b) => (b.onclick = () => download(b, [b.dataset.dl])));
    const regen = () => { replaceProjectId = p.id; start(); };
    $('[data-regen]', root).onclick = regen;
    $$('[data-copy]', root).forEach((b) => (b.onclick = () => copyText(Docs.plainText(p.docs[b.dataset.copy], st.kb, p.brief), label[b.dataset.copy])));
    $$('[data-add-gap]', root).forEach((b) => (b.onclick = () => {
      const it = issues[+b.dataset.addGap];
      openAddEvidence({ requirement: it.title, keyword: it.keyword, onSaved: (owner) => {
        const row = $(`[data-issue="${b.dataset.addGap}"]`, root);
        row.classList.add('is-resolved');
        $('.qg-issue-tag', row).textContent = 'Added';
        $('.qg-issue-detail', row).textContent = `Saved to ${owner}. Regenerate to use it.`;
        b.outerHTML = `<button class="btn btn-primary btn-sm qg-issue-act" data-regen-gap>${icon('undo', 14)} Regenerate</button>`;
        $('[data-regen-gap]', row).onclick = regen;
        $('[data-regen-gap]', row).focus();
      } });
    }));
  }

  renderInput();
  return () => { if (pipeline) pipeline.cancel(); stopTimer(); };
}

/* ---------- Settings: Quick generate defaults ---------- */
function quickSettingsHtml() {
  const q = quickPrefs();
  return `
    <section class="settings-section">
      <h2>Quick generate defaults</h2>
      <p class="muted">Used when you go straight from a job description to finished documents.</p>
      <div class="pref-list">
        <div class="pref"><div><strong>Default theme</strong><div class="muted small">Font, spacing and accent colour</div></div>
          <select class="pref-select" data-q="theme" aria-label="Default theme">${Object.entries(MOCK.themePresets).map(([k, t]) => `<option value="${k}" ${q.theme === k ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
        <div class="pref"><div><strong>Page budget</strong><div class="muted small">The resume is trimmed to fit</div></div>
          <div class="seg" data-q-seg="pages">${[1, 2].map((n) => `<button class="${q.pages === n ? 'on' : ''}" data-v="${n}">${n} ${n === 1 ? 'page' : 'pages'}</button>`).join('')}</div></div>
        <div class="pref"><div><strong>Cover letter</strong><div class="muted small">Write one alongside the resume</div></div>
          <label class="toggle"><input type="checkbox" role="switch" data-q="coverLetter" ${q.coverLetter ? 'checked' : ''}><span class="toggle-track" aria-hidden="true"></span><span class="toggle-text">${q.coverLetter ? 'On' : 'Off'}</span></label></div>
        <div class="pref"><div><strong>Cover letter tone</strong><div class="muted small">You can change it per paragraph in Studio</div></div>
          <select class="pref-select" data-q="tone" aria-label="Cover letter tone" ${q.coverLetter ? '' : 'disabled'}>${['Professional', 'Warm', 'Concise'].map((t) => `<option ${q.tone === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      </div>
    </section>`;
}

function bindQuickSettings(root) {
  const q = quickPrefs();
  const saved = () => { Store.save(); toast('Preference saved'); };
  $$('select[data-q]', root).forEach((sel) => (sel.onchange = () => { q[sel.dataset.q] = sel.value; saved(); }));
  const cl = $('input[data-q="coverLetter"]', root);
  cl.onchange = () => {
    q.coverLetter = cl.checked;
    $('.toggle-text', cl.parentElement).textContent = cl.checked ? 'On' : 'Off';
    $('select[data-q="tone"]', root).disabled = !cl.checked;
    saved();
  };
  $$('[data-q-seg] button', root).forEach((b) => (b.onclick = () => {
    q.pages = +b.dataset.v;
    $$('[data-q-seg] button', root).forEach((x) => x.classList.toggle('on', x === b));
    saved();
  }));
}

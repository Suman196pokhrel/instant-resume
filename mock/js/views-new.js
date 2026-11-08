/* New project: choose Quick generate or Studio. The Studio path pastes a JD, reviews the job brief, chooses KB entries, generates. */

Views.new = function (root, params) {
  if (params[0] === 'quick') return quickView(root);
  if (params[0] === 'studio') return studioSetupView(root);
  return newProjectChooser(root);
};

function newProjectChooser(root) {
  root.innerHTML = shell(`
    <div class="new-wrap">
      <div class="page-head"><div><h1>New application</h1><p class="muted">One application per job. How would you like to start?</p></div></div>
      <div class="choice-grid">
        <a class="choice choice-primary" href="#/new/quick">
          <span class="choice-top"><span class="choice-ic">${icon('zap', 20)}</span><span class="pill pill-ok">Recommended</span></span>
          <h2>Quick generate</h2>
          <p>Paste a job description and get a finished resume and cover letter in about 15 seconds. Anything missing is flagged, never blocking.</p>
          <span class="btn btn-primary">Quick generate</span>
        </a>
        <a class="choice" href="#/new/studio">
          <span class="choice-top"><span class="choice-ic">${icon('layers', 20)}</span></span>
          <h2>Open in Studio</h2>
          <p>Review the job brief, choose which experience to use, then edit each section yourself before you export.</p>
          <span class="btn btn-ghost">Open in Studio</span>
        </a>
      </div>
      <p class="muted small choice-note">You can open anything made with Quick generate in Studio later.</p>
    </div>`, { route: 'dashboard', title: `<a class="crumb" href="#/dashboard">${icon('chevLeft', 15)} Applications</a><span class="crumb-sep">/</span><span>New application</span>` });
  bindShell(root);
}

function studioSetupView(root) {
  const st = Store.state;
  if (!st.newDraft) st.newDraft = { stage: 'jd', jdText: '', brief: null, selected: null };
  const nd = st.newDraft;
  if (nd.stage === 'extracting' || nd.stage === 'generating') nd.stage = nd.brief ? (nd.stage === 'generating' ? 'select' : 'brief') : 'jd';
  let alive = true;
  let failure = null;

  const STEPS = [['jd', 'Job description'], ['brief', 'Job brief'], ['select', 'Choose entries'], ['generating', 'Generate']];
  const stepIdx = () => ({ jd: 0, extracting: 1, brief: 1, select: 2, generating: 3 }[nd.stage]);
  const model = () => st.activeModel.model;
  const hasConn = () => !!st.connections[st.activeModel.provider];

  function frame(inner) {
    root.innerHTML = shell(`
      <div class="new-wrap">
        <ol class="stepper">${STEPS.map(([k, l], i) => `<li class="${i === stepIdx() ? 'current' : ''} ${i < stepIdx() ? 'done' : ''}"><span class="step-num">${i < stepIdx() ? icon('check', 12) : i + 1}</span>${l}</li>`).join('')}</ol>
        ${inner}
      </div>`, { route: 'dashboard', title: `<a class="crumb" href="#/dashboard">${icon('chevLeft', 15)} Applications</a><span class="crumb-sep">/</span><a class="crumb" href="#/new">New application</a><span class="crumb-sep">/</span><span>Studio</span>` });
    bindShell(root);
  }

  function renderJd() {
    frame(`
      <section class="panel new-panel">
        <h1>Paste the job description</h1>
        <p class="muted">Paste the whole ad as plain text. You'll see what was extracted before anything is generated.</p>
        ${!hasConn() ? `<div class="callout callout-warn">${icon('key', 16)}<div><strong>No API key connected.</strong> Extraction and generation run on your own provider account. <a href="#/settings">Add a key in Settings</a></div></div>` : ''}
        <div class="sample-row"><span class="muted small">Try a sample ad:</span>${MOCK.jds.map((j) => `<button class="chip chip-btn" data-sample="${j.id}">${esc(j.label)}</button>`).join('')}</div>
        <textarea class="jd-input" placeholder="Senior Frontend Engineer&#10;Company, Sydney NSW&#10;&#10;What you'll do…" data-jd>${esc(nd.jdText)}</textarea>
        <div class="field-error" data-jd-err hidden></div>
        <div class="new-foot">
          <span class="muted small" data-count>${nd.jdText.length.toLocaleString()} characters</span>
          <button class="btn btn-primary" data-extract ${hasConn() ? '' : 'disabled'}>${icon('spark')} Extract requirements</button>
        </div>
      </section>`);
    const ta = $('[data-jd]', root);
    ta.oninput = () => { nd.jdText = ta.value; $('[data-count]', root).textContent = ta.value.length.toLocaleString() + ' characters'; $('[data-jd-err]', root).hidden = true; Store.save(); };
    $$('[data-sample]', root).forEach((b) => (b.onclick = () => { ta.value = MOCK.jds.find((j) => j.id === b.dataset.sample).text; ta.oninput(); }));
    $('[data-extract]', root).onclick = async () => {
      if (nd.jdText.trim().length < 80) {
        const e = $('[data-jd-err]', root); e.hidden = false; e.textContent = 'That looks too short to be a full job description. Paste the whole ad, including requirements.';
        return;
      }
      nd.stage = 'extracting'; renderExtracting();
      await sleep(1700);
      if (!alive) return;
      nd.brief = Docs.extractBrief(nd.jdText);
      nd.selected = Docs.suggestSelection(st.kb, nd.brief);
      nd.stage = 'brief'; Store.save(); renderBrief();
    };
  }

  function renderExtracting() {
    frame(`
      <section class="panel new-panel">
        <div class="working"><span class="spinner"></span> Reading the job description with ${esc(model())}…</div>
        <div class="brief-skeleton">
          <div class="sk sk-title"></div><div class="sk sk-line w60"></div>
          <div class="sk-grid"><div><div class="sk sk-line w40"></div>${'<div class="sk sk-line"></div>'.repeat(5)}</div><div><div class="sk sk-line w40"></div><div class="sk-chips">${'<span class="sk sk-chip"></span>'.repeat(9)}</div></div></div>
        </div>
      </section>`);
  }

  function renderBrief() {
    const b = nd.brief;
    const kbText = Docs.kbAllText(st.kb);
    frame(`
      <section class="panel new-panel">
        <div class="panel-head"><div><h1>Job brief</h1><p class="muted">Extracted from the ad. Fix anything that's wrong; keywords drive tailoring and checks.</p></div>
          <span class="pill">${icon('spark', 12)} Extracted by ${esc(model())}</span></div>
        <div class="brief-fields form-grid">
          <div class="field"><label>Role</label><input data-b="title" value="${esc(b.title)}"></div>
          <div class="field"><label>Company</label><input data-b="company" value="${esc(b.company)}"></div>
          <div class="field"><label>Location</label><input data-b="location" value="${esc(b.location)}"></div>
          <div class="field"><label>Team <span class="optional">optional</span></label><input data-b="team" value="${esc(b.team || '')}"></div>
        </div>
        <div class="brief-cols">
          <div>
            <h3>Requirements</h3>
            <ul class="req-list">${b.requirements.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
            ${b.niceToHave.length ? `<h3>Nice to have</h3><ul class="req-list req-soft">${b.niceToHave.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
            ${b.workRights && b.workRights !== 'Not stated' ? `<div class="callout">${icon('shield', 16)}<div><strong>${esc(b.workRights)}.</strong> Your knowledge base says: ${esc(st.kb.workRights.status)}.</div></div>` : ''}
          </div>
          <div>
            <h3>Keywords</h3>
            <p class="muted small">Teal keywords are backed by your knowledge base. Grey ones aren't, so they can't be claimed.</p>
            <div class="chips kw-chips">${b.keywords.map((k, i) => `<span class="chip ${Docs.kwMatch(kbText, k) ? 'chip-ok' : 'chip-missing'}">${Docs.kwMatch(kbText, k) ? icon('check', 12) : ''}${esc(k)}<button data-kw-rm="${i}" aria-label="Remove ${esc(k)}">${icon('x', 11)}</button></span>`).join('')}</div>
            <div class="input-row kw-add"><input placeholder="Add a keyword" data-kw-new><button class="btn btn-ghost btn-sm" data-kw-add>Add</button></div>
          </div>
        </div>
        <div class="new-foot">
          <button class="btn btn-ghost" data-back>${icon('chevLeft', 15)} Edit job description</button>
          <button class="btn btn-primary" data-next>Choose entries ${icon('chevRight', 15)}</button>
        </div>
      </section>`);
    $$('[data-b]', root).forEach((i) => (i.oninput = () => { b[i.dataset.b] = i.value; Store.save(); }));
    $$('[data-kw-rm]', root).forEach((x) => (x.onclick = () => { b.keywords.splice(+x.dataset.kwRm, 1); Store.save(); renderBrief(); }));
    const add = () => { const v = $('[data-kw-new]', root).value.trim(); if (v) { b.keywords.push(v); Store.save(); renderBrief(); $('[data-kw-new]', root).focus(); } };
    $('[data-kw-add]', root).onclick = add;
    $('[data-kw-new]', root).onkeydown = (e) => { if (e.key === 'Enter') add(); };
    $('[data-back]', root).onclick = () => { nd.stage = 'jd'; Store.save(); renderJd(); };
    $('[data-next]', root).onclick = () => { nd.stage = 'select'; Store.save(); renderSelect(); };
  }

  function renderSelect() {
    const b = nd.brief;
    const groups = [
      ['roles', 'Experience', (e) => `${e.title}, ${e.company}`],
      ['volunteering', 'Volunteer work', (e) => `${e.title}, ${e.company}`],
      ['additional', 'Additional sections', (e) => e.title],
      ['portfolio', 'Portfolio', (e) => e.name],
      ['education', 'Education', (e) => `${e.degree}, ${e.institution}`],
      ['credentials', 'Certifications and awards', (e) => e.title],
      ['referees', 'Referees', (e) => `${e.name}, ${e.title}`],
    ];
    const total = groups.reduce((n, [k]) => n + st.kb[k].filter(e => !e.referenceOnly).length, 0);
    const suggested = Docs.suggestSelection(st.kb, b);
    frame(`
      <section class="panel new-panel">
        <div class="panel-head"><div><h1>Choose what to draw on</h1><p class="muted">Suggestions are based on keyword matches. Only ticked entries can appear in the documents.</p></div>
          <span class="pill" data-sel-count>${nd.selected.length} of ${total} selected</span></div>
        <div class="select-groups">
          ${groups.map(([k, label, name]) => st.kb[k].filter(e => !e.referenceOnly).length ? `
            <fieldset class="select-group"><legend>${label}</legend>
              ${st.kb[k].filter(e => !e.referenceOnly).map((e) => {
                const m = Docs.matchedKeywords(Docs.entryText(e), b.keywords);
                return `<label class="select-item">
                  <input type="checkbox" value="${e.id}" ${nd.selected.includes(e.id) ? 'checked' : ''}>
                  <span class="si-main"><span class="si-name">${esc(name(e))}</span>
                  <span class="muted small">${m.length ? 'Matches ' + m.slice(0, 5).map(esc).join(', ') : 'No keyword matches'}</span></span>
                  ${suggested.includes(e.id) ? '<span class="pill pill-ok">Suggested</span>' : ''}
                </label>`;
              }).join('')}
            </fieldset>` : '').join('')}
        </div>
        <div class="new-foot">
          <button class="btn btn-ghost" data-back>${icon('chevLeft', 15)} Job brief</button>
          <div class="row-gap"><span class="muted small">Runs on ${esc(model())}, about 6,000 tokens</span>
          <button class="btn btn-primary" data-generate>${icon('spark')} Generate resume and cover letter</button></div>
        </div>
      </section>`);
    $$('.select-item input', root).forEach((c) => (c.onchange = () => {
      nd.selected = $$('.select-item input:checked', root).map((x) => x.value);
      $('[data-sel-count]', root).textContent = `${nd.selected.length} of ${total} selected`;
      Store.save();
    }));
    $('[data-back]', root).onclick = () => { nd.stage = 'brief'; Store.save(); renderBrief(); };
    $('[data-generate]', root).onclick = () => {
      if (!nd.selected.length) return toast('Select at least one knowledge base entry', { kind: 'error' });
      generate();
    };
  }

  const STAGES = [
    { k: 'match', label: 'Matching knowledge base entries to the brief', ms: 900, llm: false },
    { k: 'resume', label: 'Drafting the resume', ms: 2600, llm: true },
    { k: 'letter', label: 'Drafting the cover letter', ms: 2100, llm: true },
    { k: 'validate', label: 'Validating the response', ms: 500, llm: false, done: '14 operations, all valid' },
    { k: 'checks', label: 'Running checks', ms: 500, llm: false },
    { k: 'render', label: 'Rendering the PDF preview', ms: 900, llm: false },
  ];

  async function generate() {
    nd.stage = 'generating';
    failure = null;
    const willFail = st.demo.failGeneration;
    const startedAt = performance.now();
    frame(`
      <section class="panel new-panel gen-panel">
        <div class="gen-left">
          <h1>Generating for ${esc(nd.brief.company)}</h1>
          <p class="muted">Using ${esc(model())}. Only facts from the entries you chose can be used.</p>
          <ol class="gen-stages">${STAGES.map((s) => `<li data-stage="${s.k}"><span class="gs-icon"></span><span class="gs-label">${esc(s.label)}${s.llm ? '' : ' <span class="tag-local">on device</span>'}</span><span class="gs-time muted small"></span></li>`).join('')}</ol>
          <div class="gen-elapsed muted small" data-elapsed>0.0s</div>
          <div data-error></div>
        </div>
        <div class="gen-right" aria-hidden="true">
          <div class="ghost-sheet"><div class="gs-name"></div><div class="gs-contact"></div><div data-ghost></div></div>
        </div>
      </section>`);
    const timer = setInterval(() => { const el = $('[data-elapsed]', root); if (el) el.textContent = ((performance.now() - startedAt) / 1000).toFixed(1) + 's elapsed'; }, 100);
    const ghost = $('[data-ghost]', root);
    const addGhost = (cls, n) => { for (let i = 0; i < n; i++) { const d = document.createElement('div'); d.className = 'gl ' + cls; d.style.width = (cls === 'gl-h' ? 30 : 60 + Math.random() * 38) + '%'; ghost.appendChild(d); } };

    for (const s of STAGES) {
      if (!alive) { clearInterval(timer); return; }
      const li = $(`[data-stage="${s.k}"]`, root);
      li.classList.add('active');
      const t0 = performance.now();
      if (s.k === 'resume') {
        for (let i = 0; i < 5; i++) { addGhost('gl-h', 1); addGhost('gl-l', 3); await sleep(s.ms / 5); if (!alive) break; }
      } else if (s.k === 'letter' && willFail) {
        await sleep(1100);
        clearInterval(timer);
        li.classList.remove('active'); li.classList.add('failed');
        st.demo.failGeneration = false; Store.save();
        return showFailure();
      } else await sleep(s.ms);
      li.classList.remove('active'); li.classList.add('done');
      $('.gs-time', li).textContent = s.done || ((performance.now() - t0) / 1000).toFixed(1) + 's';
    }
    clearInterval(timer);
    if (!alive) return;
    const p = Docs.createProject(st.kb, nd.jdText, clone(nd.brief), nd.selected);
    st.projects.push(p);
    st.newDraft = null;
    Store.saveNow();
    sessionStorage.setItem('rt-fresh', ((performance.now() - startedAt) / 1000).toFixed(1));
    location.hash = '#/project/' + p.id;
  }

  function showFailure() {
    const prov = MOCK.providers.find((p) => p.id === st.activeModel.provider).name;
    $('[data-error]', root).innerHTML = `
      <div class="callout callout-error">
        ${icon('alert', 16)}
        <div>
          <strong>Generation stopped while drafting the cover letter.</strong>
          <p>${esc(prov)} returned <code>529 overloaded_error</code>: the model is busy. Nothing was saved, and your job description, brief and selections are kept.</p>
          <div class="row-gap"><button class="btn btn-primary btn-sm" data-retry>Retry</button><button class="btn btn-ghost btn-sm" data-switch>Switch model</button><button class="btn btn-ghost btn-sm" data-back-sel>Back to entries</button></div>
        </div>
      </div>`;
    $('[data-retry]', root).onclick = generate;
    $('[data-switch]', root).onclick = () => $('[data-model-toggle]', root).click();
    $('[data-back-sel]', root).onclick = () => { nd.stage = 'select'; renderSelect(); };
  }

  ({ jd: renderJd, extracting: renderJd, brief: renderBrief, select: renderSelect }[nd.stage] || renderJd)();
  return () => { alive = false; };
}

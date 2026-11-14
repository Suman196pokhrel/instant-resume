/* Onboarding wizard: builds the knowledge base step by step, saving after each step. */

const ONB_STEPS = [
  { key: 'contact', title: 'Contact details', blurb: 'How employers reach you. This goes at the top of every resume and cover letter.', req: true },
  { key: 'workRights', title: 'Work rights', blurb: 'Australian employers often screen on this, so it can be included when relevant.', req: false },
  { key: 'roles', title: 'Experience', blurb: 'Add each role, newest first. Highlights are the raw material for bullets, so be specific and include numbers.', req: false },
  { key: 'volunteering', title: 'Volunteer work', blurb: 'Community work, mentoring and unpaid roles count too.', req: false },
  { key: 'portfolio', title: 'Portfolio items', blurb: 'Personal, academic or open-source work you built.', req: false },
  { key: 'education', title: 'Education', blurb: 'Degrees, diplomas and relevant courses.', req: false },
  { key: 'skills', title: 'Skills', blurb: 'Group your skills. Only skills listed here can appear on a resume.', req: false },
  { key: 'credentials', title: 'Achievements and publications', blurb: 'Certifications, awards, talks, papers and patents.', req: false },
  { key: 'referees', title: 'Referees', blurb: 'People who can speak to your work. Optional.', req: false },
  { key: 'additional', title: 'Additional sections', blurb: 'Keep languages, interests, summaries and any other details from your resume.', req: false },
  { key: 'review', title: 'Review', blurb: 'Check everything looks right, then save it to your knowledge base.' },
];

function emptyDraft() {
  return normalizeKnowledgeBase({});
}

Views.onboarding = function (root, params = []) {
  if (params[0] !== 'manual' && !Store.state.onboarding.visited && !Store.state.onboarding.imported) {
    root.innerHTML = shell(`<div class="new-wrap"><div class="page-head"><div><h1>Build your knowledge base</h1><p class="muted">Start from your existing resume or enter your background yourself.</p></div></div><div class="choice-grid"><a class="choice choice-primary" href="#/import"><span class="choice-ic">${icon('upload',24)}</span><h2>Import an existing resume</h2><p>Bring in your contact details, experience, volunteer work, education and other sections. Review everything before saving.</p><span class="btn btn-primary">Upload resume</span></a><a class="choice" href="#/onboarding/manual"><span class="choice-ic">${icon('pencil',24)}</span><h2>Enter details manually</h2><p>Work through the guided fields at your own pace. Optional sections can be skipped.</p><span class="btn btn-ghost">Start manually</span></a></div><p class="muted small">Open source, self-hosted, with your own AI provider key. This mock makes no provider calls.</p></div>`,{route:'kb',title:'Set up your background'});
    bindShell(root); return;
  }
  const st = Store.state;
  const ob = st.onboarding;
  if (!ob.draft) ob.draft = emptyDraft();
  normalizeKnowledgeBase(ob.draft);
  if (ob.replace == null) ob.replace = !!st.sampleKb || (st.sampleKb == null && st.kb.contact.name === MOCK.kb.contact.name);
  ob.step = Math.min(ob.step, ONB_STEPS.length - 1);
  const resumed = ob.visited && ob.step > 0;
  ob.visited = true;
  Store.save();
  let editingIdx = null; // index of a repeatable entry being edited

  function render(dir = 0) {
    const step = ONB_STEPS[ob.step];
    const pct = Math.round((ob.step / (ONB_STEPS.length - 1)) * 100);
    const left = ONB_STEPS.length - 1 - ob.step;
    root.innerHTML = `
      <div class="onb">
        <header class="onb-top">
          <a class="brand" href="#/dashboard"><span class="brand-mark">${icon('file', 18)}</span><span class="brand-name">Instant Resume</span></a>
          <div class="onb-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Onboarding progress">
            <div class="onb-progress-label"><span>Step ${ob.step + 1} of ${ONB_STEPS.length}</span><span class="muted">${left ? left + (left === 1 ? ' step left' : ' steps left') : 'Last step'}</span></div>
            <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          </div>
          <a class="btn btn-ghost btn-sm" href="#/dashboard">Save and exit</a>
        </header>
        <div class="onb-body">
          <ol class="onb-steps">
            ${ONB_STEPS.map((s, i) => `<li class="${i === ob.step ? 'current' : ''} ${i < ob.step ? 'done' : ''}">
              <button ${i <= maxReached() ? '' : 'disabled'} data-goto="${i}"><span class="step-num">${i < ob.step ? icon('check', 12) : i + 1}</span><span>${esc(s.title)}</span>${s.req === false ? '<span class="optional">optional</span>' : ''}</button></li>`).join('')}
          </ol>
          <section class="onb-card ${dir > 0 ? 'slide-next' : dir < 0 ? 'slide-prev' : ''}">
            <div class="onb-card-head">
              <div><h1>${esc(step.title)}</h1><p class="muted">${esc(step.blurb)}</p></div>
              ${step.key !== 'review' ? `<button class="btn btn-ghost btn-sm" data-sample>${icon('zap', 14)} Fill with sample</button>` : ''}
            </div>
            <div class="onb-form">${stepBody(step)}</div>
            <footer class="onb-foot">
              <button class="btn btn-ghost" data-back ${ob.step === 0 ? 'disabled' : ''}>${icon('chevLeft', 15)} Back</button>
              <span class="save-state muted small" data-save-state></span>
              <div class="row-gap">
                ${step.req === false ? '<button class="btn btn-ghost" data-skip>Skip this step</button>' : ''}
                <button class="btn btn-primary" data-next>${step.key === 'review' ? 'Save to knowledge base' : 'Save and continue'}</button>
              </div>
            </footer>
          </section>
        </div>
      </div>`;
    bind(step);
  }

  function maxReached() { return Math.max(ob.step, ob.maxStep || 0); }

  function stepBody(step) {
    const d = ob.draft;
    if (step.key === 'contact' || step.key === 'workRights') return fieldsHtml(KB_SCHEMA[step.key], d[step.key], 'onb');
    if (step.key === 'review') {
      const rows = ONB_STEPS.slice(0, -1).map((s, i) => {
        const v = d[s.key];
        const n = Array.isArray(v) ? v.length : Object.values(v).filter(Boolean).length ? 1 : 0;
        const desc = Array.isArray(v) ? v.map((e) => kbEntrySummary(s.key, e).title).join(', ') : (s.key === 'contact' ? [v.name, v.email].filter(Boolean).join(', ') : v.status);
        return `<div class="review-row"><div><strong>${esc(s.title)}</strong><div class="muted small">${n ? esc(desc || '') : 'Skipped'}</div></div>
          <span class="pill ${n ? 'pill-ok' : ''}">${Array.isArray(v) ? n + ' added' : n ? 'Done' : 'Empty'}</span>
          <button class="btn btn-ghost btn-sm" data-goto="${i}">Edit</button></div>`;
      }).join('');
      return `${ob.imported ? `<div class="callout">${icon('upload',16)}<div><strong>${esc(ob.imported)}</strong><p>Review each section. Missing information is left blank; unfamiliar sections are preserved under Additional sections.</p></div></div>` : ''}<div class="review">${rows}</div><p class="muted small">You can change any of this later from the Knowledge base screen.</p><label class="field"><span>Save behaviour</span><select data-save-mode><option value="merge" ${ob.replace ? '' : 'selected'}>Add entries; keep existing contact and work rights</option><option value="replace" ${ob.replace ? 'selected' : ''}>Replace the knowledge base with this reviewed background</option></select></label><p class="muted small">Replacement affects the knowledge base, not saved application documents.</p>`;
    }
    // Repeatable steps: saved entries, then a form for a new (or edited) one
    const list = d[step.key];
    const sch = KB_SCHEMA[step.key];
    const editing = editingIdx != null ? list[editingIdx] : {};
    return `
      ${list.length ? `<div class="onb-entries">${list.map((e, i) => {
        const s = kbEntrySummary(step.key, e);
        return `<div class="onb-entry ${i === editingIdx ? 'editing' : ''}"><div><strong>${esc(s.title)}</strong><div class="muted small">${esc(s.sub || (s.chips || []).join(', '))}</div>${e.highlights ? `<div class="muted small">${e.highlights.length} highlights</div>` : ''}</div>
          <div class="row-gap"><button class="btn btn-ghost btn-sm" data-edit-entry="${i}">Edit</button><button class="icon-btn" data-remove-entry="${i}" aria-label="Remove">${icon('trash', 15)}</button></div></div>`;
      }).join('')}</div>` : ''}
      <form class="onb-entry-form" novalidate>
        <div class="onb-entry-form-head">${list.length ? `<strong>${editingIdx != null ? 'Edit ' + sch.noun : 'Add another ' + sch.noun}</strong>` : `<strong>Add your first ${esc(sch.noun)}</strong>`}</div>
        ${fieldsHtml(sch, editing, 'onb')}
        ${sch.highlights ? highlightsEditorHtml(editing.highlights) : ''}
        <div class="row-gap"><button type="button" class="btn btn-ghost btn-sm" data-save-entry>${icon('check', 14)} ${editingIdx != null ? 'Update' : 'Save'} ${esc(sch.noun)}</button></div>
      </form>
      <div class="field-error step-error" hidden></div>`;
  }

  function formHasContent(form) { return $$('input, textarea', form).some((i) => i.value.trim()) || $$('select', form).some((s) => s.value); }

  function saveEntry(step, quiet) {
    const form = $('.onb-entry-form', root);
    const sch = KB_SCHEMA[step.key];
    if (!validateFields(form, sch)) return false;
    const vals = readFields(form, sch);
    if (sch.highlights) vals.highlights = readHighlights(form, editingIdx != null ? ob.draft[step.key][editingIdx].highlights : []);
    if (editingIdx != null) Object.assign(ob.draft[step.key][editingIdx], vals);
    else ob.draft[step.key].push({ id: uid(step.key.slice(0, 2)), ...vals });
    editingIdx = null;
    Store.save();
    if (!quiet) { render(); flashSaved(); }
    return true;
  }

  function flashSaved() {
    const s = $('[data-save-state]', root);
    if (!s) return;
    s.innerHTML = `${icon('check', 13)} Saved`;
    s.classList.add('flash');
  }

  function go(i, dir) {
    ob.step = i; ob.maxStep = Math.max(ob.maxStep || 0, i); editingIdx = null; Store.save();
    render(dir);
    window.scrollTo(0, 0);
  }

  function bind(step) {
    const mode = $('[data-save-mode]', root);
    if (mode) mode.onchange = () => { ob.replace = mode.value === 'replace'; Store.save(); };
    $$('[data-goto]', root).forEach((b) => (b.onclick = () => go(+b.dataset.goto, +b.dataset.goto > ob.step ? 1 : -1)));
    $('[data-back]', root).onclick = () => go(ob.step - 1, -1);
    const skip = $('[data-skip]', root);
    if (skip) skip.onclick = () => go(ob.step + 1, 1);
    bindHighlightsEditor(root);

    const sample = $('[data-sample]', root);
    if (sample) sample.onclick = () => {
      const src = clone(MOCK.kb[step.key] || []);
      ob.draft[step.key] = src; editingIdx = null; Store.save();
      render(); toast('Filled with sample data');
    };

    const saveBtn = $('[data-save-entry]', root);
    if (saveBtn) saveBtn.onclick = () => saveEntry(step);
    $$('[data-edit-entry]', root).forEach((b) => (b.onclick = () => { editingIdx = +b.dataset.editEntry; render(); }));
    $$('[data-remove-entry]', root).forEach((b) => (b.onclick = () => { ob.draft[step.key].splice(+b.dataset.removeEntry, 1); editingIdx = null; Store.save(); render(); }));

    $('[data-next]', root).onclick = async (e) => {
      if (step.key === 'review') return finish();
      const sch = KB_SCHEMA[step.key];
      if (sch.single) {
        const form = $('.onb-form', root);
        if (!validateFields(form, sch)) return;
        ob.draft[step.key] = { id: 'kb-' + step.key, ...readFields(form, sch) };
      } else {
        const form = $('.onb-entry-form', root);
        if (formHasContent(form) && !saveEntry(step, true)) return;
        if (step.min && ob.draft[step.key].length < step.min) {
          const err = $('.step-error', root);
          err.hidden = false; err.textContent = `Add at least one ${sch.noun} to continue. You can add more later.`;
          return;
        }
      }
      const btn = e.currentTarget;
      btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-light"></span> Saving';
      Store.saveNow();
      await sleep(350);
      go(ob.step + 1, 1);
      flashSaved();
    };
  }

  function finish() {
    const d = ob.draft;
    if (!d.contact.name || !d.contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.contact.email)) { toast('Review your name and a valid email in Contact details before saving.', {kind:'error'}); go(0, -1); return; }
    if (ob.replace) st.kb = emptyDraft();
    let added = 0;
    if (d.contact.name && !st.kb.contact.name) { Object.assign(st.kb.contact, d.contact, { id: 'kb-contact' }); added++; }
    if (d.workRights.status && !st.kb.workRights.status) { Object.assign(st.kb.workRights, d.workRights, { id: 'kb-rights' }); added++; }
    ['roles', 'volunteering', 'portfolio', 'education', 'skills', 'credentials', 'referees', 'additional'].forEach((k) => {
      d[k].forEach((e) => { if (!st.kb[k].some((x) => x.id === e.id)) { st.kb[k].push(e); added++; } });
    });
    st.onboarding = { step: 0, draft: null, visited: false };
    st.dismissedOnboardingBanner = true;
    st.sampleKb = false;
    Store.saveNow();
    root.innerHTML = `
      <div class="onb onb-done">
        <div class="done-card">
          <div class="done-check"><svg viewBox="0 0 52 52" width="64" height="64"><circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <h1>Your knowledge base is ready</h1>
          <p class="muted">${added} entries saved. Every resume and cover letter you make will draw only on these facts.</p>
          <div class="row-gap center">
            <a class="btn btn-ghost" href="#/kb">Review knowledge base</a>
            <a class="btn btn-primary" href="#/new">${icon('plus')} Start an application</a>
          </div>
        </div>
      </div>`;
  }

  render();
  if (resumed) toast(`Picked up where you left off: ${ONB_STEPS[ob.step].title}`);
};

/* Dashboard, Knowledge base and Settings screens. */

/* ---------- KB field schemas (shared with onboarding) ---------- */
const KB_SCHEMA = {
  contact: { label: 'Contact', single: true, fields: [
    { k: 'name', label: 'Full name', req: true, ph: 'Jordan Whitlock' },
    { k: 'email', label: 'Email', req: true, type: 'email', ph: 'you@example.com' },
    { k: 'phone', label: 'Phone', ph: '04xx xxx xxx' },
    { k: 'location', label: 'Location', req: true, ph: 'Sydney NSW' },
    { k: 'linkedin', label: 'LinkedIn', ph: 'linkedin.com/in/…' },
    { k: 'github', label: 'GitHub or website', ph: 'github.com/…' },
  ] },
  workRights: { label: 'Work rights', single: true, fields: [
    { k: 'status', label: 'Work rights', req: true, type: 'select', options: ['Australian citizen', 'Permanent resident', 'New Zealand citizen', 'Temporary visa with full work rights', 'Temporary visa with limited work rights', 'Requires sponsorship'] },
    { k: 'noticePeriod', label: 'Notice period', ph: '4 weeks' },
    { k: 'notes', label: 'Notes', ph: 'Security clearance, visa expiry, etc.', wide: true },
  ] },
  roles: { label: 'Experience', noun: 'role', highlights: true, fields: [
    { k: 'title', label: 'Job title', req: true, ph: 'Senior Software Engineer' },
    { k: 'company', label: 'Employer', req: true, ph: 'Company name' },
    { k: 'location', label: 'Location', ph: 'Sydney NSW' },
    { k: 'start', label: 'Start', req: true, ph: 'Mar 2022' },
    { k: 'end', label: 'End', req: true, ph: 'Present' },
  ] },
  portfolio: { label: 'Portfolio', noun: 'portfolio item', highlights: true, fields: [
    { k: 'name', label: 'Name', req: true, ph: 'Tidewatch' },
    { k: 'summary', label: 'One-line summary', req: true, ph: 'What it is and who uses it', wide: true },
    { k: 'link', label: 'Link', ph: 'github.com/…' },
  ] },
  education: { label: 'Education', noun: 'qualification', fields: [
    { k: 'degree', label: 'Qualification', req: true, ph: 'Bachelor of Science (Computer Science)', wide: true },
    { k: 'institution', label: 'Institution', req: true, ph: 'UNSW Sydney' },
    { k: 'year', label: 'Year completed', ph: '2017' },
    { k: 'notes', label: 'Notes', ph: 'Honours, WAM, thesis', wide: true },
  ] },
  skills: { label: 'Skills', noun: 'skill group', fields: [
    { k: 'group', label: 'Group name', req: true, ph: 'Frontend' },
    { k: 'items', label: 'Skills, separated by commas', req: true, ph: 'React, TypeScript, Playwright', wide: true, list: true },
  ] },
  credentials: { label: 'Certifications and awards', noun: 'credential', fields: [
    { k: 'kind', label: 'Type', req: true, type: 'select', options: ['Certification', 'Award', 'Publication', 'Patent'] },
    { k: 'title', label: 'Title', req: true, ph: 'AWS Certified Developer, Associate', wide: true },
    { k: 'issuer', label: 'Issuer', ph: 'Amazon Web Services' },
    { k: 'year', label: 'Year', ph: '2023' },
  ] },
  referees: { label: 'Referees', noun: 'referee', fields: [
    { k: 'name', label: 'Name', req: true, ph: 'Dana Okafor' },
    { k: 'title', label: 'Their job title', ph: 'Engineering Manager' },
    { k: 'company', label: 'Company', ph: 'Brightwater Logistics' },
    { k: 'contact', label: 'Email or phone', req: true, ph: 'dana@example.com' },
  ] },
};

function fieldsHtml(schema, values = {}, idp = 'f') {
  return `<div class="form-grid">${schema.fields.map((f) => {
    let v = values[f.k];
    if (f.list && Array.isArray(v)) v = v.join(', ');
    const id = `${idp}-${f.k}`;
    const input = f.type === 'select'
      ? `<select id="${id}" name="${f.k}"><option value="">Choose…</option>${f.options.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : f.type === 'textarea' ? `<textarea id="${id}" name="${f.k}" rows="6">${esc(v || '')}</textarea>`
      : `<input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(v || '')}" placeholder="${esc(f.ph || '')}" autocomplete="off">`;
    return `<div class="field ${f.wide ? 'field-wide' : ''}" data-field="${f.k}">
      <label for="${id}">${esc(f.label)}${f.req ? '' : ' <span class="optional">optional</span>'}</label>${input}
      <div class="field-error" hidden></div></div>`;
  }).join('')}</div>`;
}

function readFields(root, schema) {
  const out = {};
  schema.fields.forEach((f) => {
    const el = $(`[name="${f.k}"]`, root);
    let v = el ? el.value.trim() : '';
    if (f.list) v = v.split(',').map((x) => x.trim()).filter(Boolean);
    out[f.k] = v;
  });
  return out;
}

function validateFields(root, schema) {
  let ok = true;
  schema.fields.forEach((f) => {
    const wrap = $(`[data-field="${f.k}"]`, root);
    if (!wrap) return;
    const el = $('input,select', wrap);
    const err = $('.field-error', wrap);
    const v = el.value.trim();
    let msg = '';
    if (f.req && !v) msg = `Enter your ${f.label.toLowerCase().replace(/, separated by commas/, '')}`;
    else if (f.type === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) msg = 'Enter an email like name@example.com';
    wrap.classList.toggle('has-error', !!msg);
    err.hidden = !msg;
    err.textContent = msg;
    if (msg) ok = false;
  });
  const firstBad = $('.has-error input, .has-error select', root);
  if (firstBad) firstBad.focus();
  return ok;
}

function highlightsEditorHtml(highlights = []) {
  const row = (h) => `<div class="hl-row" data-hl-id="${esc(h.id || '')}">
      <textarea rows="2" name="hl-text" placeholder="What you did and the result, e.g. Cut API latency from 900ms to 220ms with Redis caching">${esc(h.text || '')}</textarea>
      <input name="hl-metric" placeholder="Metric, e.g. 900ms to 220ms" value="${esc(h.metric || '')}">
      <button type="button" class="icon-btn" data-hl-remove aria-label="Remove highlight">${icon('trash', 15)}</button>
    </div>`;
  return `<div class="hl-editor">
    <div class="hl-editor-head"><strong>Highlights</strong><span class="muted small">Each highlight becomes a possible resume bullet. Include numbers where you have them.</span></div>
    <div class="hl-rows">${(highlights.length ? highlights : [{}]).map(row).join('')}</div>
    <button type="button" class="btn btn-ghost btn-sm" data-hl-add>${icon('plus', 14)} Add highlight</button>
  </div>`;
}

function bindHighlightsEditor(root) {
  const rows = $('.hl-rows', root);
  if (!rows) return;
  const tmpl = () => { const d = document.createElement('div'); d.innerHTML = highlightsEditorHtml([{}]); return $('.hl-row', d); };
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-hl-add]')) { const r = tmpl(); rows.appendChild(r); $('textarea', r).focus(); }
    const rm = e.target.closest('[data-hl-remove]');
    if (rm) { rm.closest('.hl-row').remove(); if (!rows.children.length) rows.appendChild(tmpl()); }
  });
}

function readHighlights(root, prev = []) {
  return $$('.hl-row', root).map((r) => {
    const text = $('[name="hl-text"]', r).value.trim();
    if (!text) return null;
    const id = r.dataset.hlId || uid('hl');
    const old = prev.find((h) => h.id === id);
    return { id, text, metric: $('[name="hl-metric"]', r).value.trim(), skills: old ? old.skills : Docs.matchedKeywords(text, MOCK.jds.flatMap((j) => j.brief.keywords)), ...(old && old.evidenceFor ? { evidenceFor: old.evidenceFor } : {}) };
  }).filter(Boolean);
}

/* ---------- Add evidence for a gap (from Quick generate results and Workspace checks) ----------
   Saves one highlight on an existing role, volunteer role or portfolio item, or on a new role made here. The keyword
   is tagged on the highlight so the next generation can match it. Nothing is invented: the user writes the fact. */
function openAddEvidence({ requirement, keyword, onSaved }) {
  const kb = Store.state.kb;
  const groups = [['roles', 'Experience', (e) => `${e.title}, ${e.company}`], ['volunteering', 'Volunteer work', (e) => `${e.title}, ${e.company}`], ['portfolio', 'Portfolio', (e) => e.name]];
  const owners = groups.flatMap(([k]) => kb[k]);
  const roleFields = [['title', 'Job title', 'Retail Sales Assistant', 'Enter the job title'], ['company', 'Employer', 'Company name', 'Enter the employer'], ['start', 'Start', 'Mar 2022', 'Enter when you started'], ['end', 'End', 'Present', 'Enter when it ended, or Present']];
  openModal({
    title: 'Add to your knowledge base',
    body: `
      <p>The job asks for <strong>${esc(requirement)}</strong>.</p>
      <div class="callout">${icon('info', 16)}<div>Only add what's true. Future resumes can use it.</div></div>
      <form class="kb-form form-grid" novalidate>
        <div class="field field-wide"><label for="ev-owner">Add it to</label><select id="ev-owner" name="owner">${groups.map(([k, label, name]) => kb[k].length ? `<optgroup label="${label}">${kb[k].map((e) => `<option value="${e.id}">${esc(name(e))}</option>`).join('')}</optgroup>` : '').join('')}<option value="new" ${owners.length ? '' : 'selected'}>New role…</option></select></div>
        ${roleFields.map(([k, label, ph]) => `<div class="field" data-new-role data-field="${k}" ${owners.length ? 'hidden' : ''}><label for="ev-${k}">${label}</label><input id="ev-${k}" name="${k}" placeholder="${ph}"><div class="field-error" hidden></div></div>`).join('')}
        <div class="field field-wide" data-field="text"><label for="ev-text">What you did and the result</label><textarea id="ev-text" name="text" rows="3" placeholder="What you did, where, and what changed because of it. Include numbers if you have them."></textarea><div class="field-error" hidden></div></div>
        <div class="field field-wide"><label for="ev-metric">Metric <span class="optional">optional</span></label><input id="ev-metric" name="metric" placeholder="e.g. 40 to 8 minutes"></div>
      </form>`,
    actions: [{ label: 'Cancel' }, { label: 'Save to knowledge base', kind: 'btn-primary', fn: (r) => {
      const text = $('[name="text"]', r).value.trim();
      const wrap = $('[data-field="text"]', r);
      const isNew = $('[name="owner"]', r).value === 'new';
      const missing = isNew ? roleFields.filter(([k]) => !$(`[name="${k}"]`, r).value.trim()) : [];
      missing.forEach(([k, , , msg]) => { const f = $(`[data-field="${k}"]`, r); f.classList.add('has-error'); $('.field-error', f).hidden = false; $('.field-error', f).textContent = msg; });
      if (missing.length) { $(`[name="${missing[0][0]}"]`, r).focus(); return false; }
      if (!text) { wrap.classList.add('has-error'); $('.field-error', wrap).hidden = false; $('.field-error', wrap).textContent = 'Describe what you did'; $('textarea', wrap).focus(); return false; }
      const owner = isNew ? Object.fromEntries([['id', uid('role')], ...roleFields.map(([k]) => [k, $(`[name="${k}"]`, r).value.trim()]), ['highlights', []]]) : owners.find((e) => e.id === $('[name="owner"]', r).value);
      if (isNew) kb.roles.push(owner);
      const skills = Array.from(new Set([keyword, ...Docs.matchedKeywords(text, MOCK.jds.flatMap((j) => j.brief.keywords))]));
      owner.highlights = owner.highlights || [];
      owner.highlights.push({ id: uid('hl'), text, metric: $('[name="metric"]', r).value.trim(), skills, evidenceFor: requirement });
      Store.save();
      const label = owner.name || `${owner.title}, ${owner.company}`;
      toast(`Added to ${label}`);
      onSaved && onSaved(label);
    } }],
  });
  const sel = $('#ev-owner');
  sel.onchange = () => $$('[data-new-role]').forEach((f) => (f.hidden = sel.value !== 'new'));
}

// Add what's missing (app: components/workspace/AddMissingDialog.tsx): say where you used the missing keywords, check
// the bullets the (simulated) model writes, add the ones you keep. Each sentence goes on the entry it names, else the first.
function openAddMissing({ keywords, onSaved }) {
  const kb = Store.state.kb;
  const groups = [['roles', (e) => `${e.title}, ${e.company}`], ['volunteering', (e) => `${e.title}, ${e.company}`], ['portfolio', (e) => e.name]];
  const owners = groups.flatMap(([k, name]) => kb[k].map((e) => ({ e, label: name(e) })));
  let picked = [...keywords], text = '', rows = null;
  openModal({
    title: "Add what's missing",
    body: '',
    actions: [{ label: 'Cancel' }],
    onMount: (root, close) => {
      const body = $('.modal-body', root), foot = $('.modal-foot', root);
      const write = () => {
        text = $('#miss-text', root).value;
        if (!text.trim()) { const f = $('[data-field="text"]', root); f.classList.add('has-error'); $('.field-error', f).hidden = false; $('#miss-text', root).focus(); return; }
        const go = $('[data-write]', root); go.disabled = true; go.innerHTML = '<span class="spinner spinner-light spinner-xs"></span> Writing';
        setTimeout(() => {
          rows = text.split(/(?<=[.!?])\s+/).map((t) => t.trim()).filter(Boolean).flatMap((t) => {
            const kws = Docs.matchedKeywords(t, picked);
            const owner = owners.find((o) => o.label.split(', ').some((part) => Docs.matchedKeywords(t, [part]).length)) || owners[0];
            return kws.length && owner ? [{ owner, text: t, keywords: kws, on: true }] : [];
          });
          review();
        }, 1200);
      };
      const ask = () => {
        body.innerHTML = `
          <fieldset class="miss-kws"><legend>Missing from this job</legend>${keywords.map((k) => `<label class="miss-kw"><input type="checkbox" value="${esc(k)}" ${picked.includes(k) ? 'checked' : ''}> ${esc(k)}</label>`).join('')}</fieldset>
          <div class="field" data-field="text"><label for="miss-text">Where did you use them?</label><textarea id="miss-text" rows="4" placeholder="e.g. I used Docker and Kubernetes in my weather app project, and set up CI/CD with GitHub Actions at my last job">${esc(text)}</textarea><div class="field-error" hidden>Say where you used them</div></div>
          <p class="muted small">You'll check the bullets before anything is saved. Future resumes can use them too.</p>`;
        foot.innerHTML = `<button class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" data-write ${picked.length ? '' : 'disabled'}>${icon('spark', 14)} Write it</button>`;
        $$('.miss-kw input', body).forEach((c) => (c.onchange = () => { picked = $$('.miss-kw input:checked', body).map((x) => x.value); $('[data-write]', root).disabled = !picked.length; }));
        $('#miss-text', root).onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); write(); } };
        $('#miss-text', root).oninput = () => { $('[data-field="text"]', root).classList.remove('has-error'); $('.field-error', root).hidden = true; };
        $('[data-cancel]', root).onclick = close;
        $('[data-write]', root).onclick = write;
        $('#miss-text', root).focus();
      };
      const review = () => {
        const kept = () => rows.filter((r) => r.on && r.text.trim()).length;
        const owned = [...new Set(rows.map((r) => r.owner))];
        body.innerHTML = owned.length ? owned.map((o) => `<section class="miss-group"><h3>${esc(o.label)}</h3>${rows.map((r, i) => r.owner === o ? `<div class="miss-row"><input type="checkbox" data-keep="${i}" checked aria-label="Keep this bullet"><div><textarea rows="2" data-row="${i}" aria-label="Bullet">${esc(r.text)}</textarea><div class="chips chips-tight">${r.keywords.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</div></div></div>` : '').join('')}</section>`).join('')
          : '<p>No bullets came out of that. Go back and say which job or project you used them in.</p>';
        const label = () => (kept() === 1 ? 'Add 1 to knowledge base' : `Add ${kept()} to knowledge base`);
        foot.innerHTML = `<button class="btn btn-ghost" data-back>Back</button><button class="btn btn-primary" data-add ${kept() ? '' : 'disabled'}>${label()}</button>`;
        const sync = () => { const b = $('[data-add]', root); b.textContent = label(); b.disabled = !kept(); };
        $$('[data-keep]', body).forEach((c) => (c.onchange = () => { const r = rows[+c.dataset.keep]; r.on = c.checked; $(`[data-row="${c.dataset.keep}"]`, body).disabled = !c.checked; sync(); }));
        $$('[data-row]', body).forEach((t) => (t.oninput = () => { rows[+t.dataset.row].text = t.value; sync(); }));
        $('[data-back]', root).onclick = ask;
        $('[data-add]', root).onclick = () => {
          const keep = rows.filter((r) => r.on && r.text.trim());
          keep.forEach((r) => { r.owner.e.highlights = r.owner.e.highlights || []; r.owner.e.highlights.push({ id: uid('hl'), text: r.text.trim(), metric: '', skills: r.keywords, evidenceFor: r.keywords[0] }); });
          Store.save();
          toast(`Added ${keep.length} to your knowledge base`);
          close();
          onSaved && onSaved();
        };
      };
      ask();
    },
  });
}

/* ---------- Dashboard ---------- */
function monogram(name) {
  const hues = [168, 212, 330, 28, 260, 120];
  const h = hues[name.charCodeAt(0) % hues.length];
  return `<span class="monogram" style="--h:${h}">${esc(name.charAt(0))}</span>`;
}

// First-run checklist: key → background → first application. Hidden once all done or dismissed.
function setupChecklistHtml(st) {
  const steps = [
    { done: Object.keys(st.connections).length > 0, title: 'Connect your AI provider', detail: 'Paste an API key from Anthropic, OpenAI or Gemini. You pay your provider directly.', href: '#/settings', cta: 'Add a key' },
    { done: !st.sampleKb, title: 'Add your background', detail: 'Import your resume and review what was found. About 2 minutes.', href: '#/import', cta: 'Import resume', alt: '<a href="#/onboarding/manual">or enter it manually</a>' },
    { done: st.projects.some((p) => !p.sample), title: 'Make your first application', detail: 'Paste a job ad and get a tailored resume and cover letter in about 15 seconds.', href: '#/new/quick', cta: 'Quick generate' },
  ];
  const n = steps.filter((s) => s.done).length;
  if (n === steps.length || st.dismissedOnboardingBanner) return '';
  const next = steps.findIndex((s) => !s.done);
  return `<section class="setup" aria-labelledby="setup-h">
    <div class="setup-head"><div><h2 id="setup-h">Get set up</h2><span class="muted small">${n} of ${steps.length} done. This demo starts with sample data.</span></div>
      <button class="icon-btn" data-dismiss-banner aria-label="Dismiss setup checklist">${icon('x')}</button></div>
    <ol class="setup-steps">${steps.map((s, i) => `
      <li class="${s.done ? 'done' : ''}">
        <span class="step-num" aria-hidden="true">${s.done ? icon('check', 12) : i + 1}</span>
        <span class="setup-text"><strong>${s.title}</strong><span class="sr-only">${s.done ? ' (done)' : ''}</span><span class="muted small">${s.detail}</span></span>
        ${s.done ? '' : `<span class="setup-act"><a class="btn btn-sm ${i === next ? 'btn-primary' : 'btn-ghost'}" href="${s.href}">${s.cta}</a>${s.alt ? `<span class="small">${s.alt}</span>` : ''}</span>`}
      </li>`).join('')}</ol>
  </section>`;
}

Views.dashboard = function (root) {
  const st = Store.state;
  let query = '';
  // With an application to open, warm the (simulated) renderer once the page is idle, so the Workspace skips its loader
  if (!st.demo.emptyDashboard && st.projects.length) (window.requestIdleCallback || ((f) => setTimeout(f, 1000)))(() => sessionStorage.setItem('rt-typst', '1'));
  function render() {
    const projects = (st.demo.emptyDashboard ? [] : st.projects).filter(p => (p.company + ' ' + p.role).toLowerCase().includes(query.toLowerCase())).sort((a,b) => b.updatedAt-a.updatedAt);
    root.innerHTML = shell(`
      ${setupChecklistHtml(st)}
      <div class="page-head"><div><h1>Applications</h1><p class="muted">One job description, a tailored resume and a cover letter. Everything saves automatically.</p></div><div class="search"><input type="search" data-search aria-label="Search applications" placeholder="Search company or role" value="${esc(query)}"></div></div>
      ${!projects.length && !query ? `<div class="empty-state"><span class="empty-icon">${icon('file',24)}</span><h3>No applications yet</h3><p class="muted">An application holds the job description, your tailored resume and your cover letter for one job.</p><a class="btn btn-primary" href="#/new">${icon('plus')} New application</a></div>` : `
      <div class="card-grid">${projects.map(p => `<article class="project-card"><div class="pc-top">${monogram(p.company)}<button class="icon-btn" data-menu="${p.id}" aria-label="More for ${esc(p.company)}">${icon('dots')}</button></div><a class="pc-role" href="#/project/${p.id}">${esc(p.role)}</a><div class="pc-company">${esc(p.company)}</div><div class="muted pc-loc">${esc(p.location)}</div><div class="pc-foot muted small">Edited ${timeAgo(p.updatedAt)}</div></article>`).join('')}<a class="project-card project-card-new" href="#/new">${icon('plus')} New application</a></div>
      ${!projects.length ? '<p class="muted">No matching applications.</p>' : ''}`}
    `, {route:'dashboard', title:'', actions:'<a class="btn btn-primary" href="#/new">New application</a>'});
    bindShell(root);
    const dismiss=$('[data-dismiss-banner]',root);
    if(dismiss) dismiss.onclick=()=>{st.dismissedOnboardingBanner=true;Store.save();render();};
    $('[data-search]',root).oninput = debounce(e => { query=e.target.value; render(); const el=$('[data-search]',root); el.focus(); el.setSelectionRange(query.length,query.length); },150);
    $$('[data-menu]',root).forEach(b => b.onclick=()=>{
      const p=Store.project(b.dataset.menu);
      openMenu(b,[
        {label:'Open',icon:'file',fn:()=>location.hash='#/project/'+p.id},
        {label:'Duplicate',icon:'copy',fn:()=>{const copy=clone(p); copy.id=uid('p'); copy.role+=' (copy)'; copy.updatedAt=Date.now(); st.projects.push(copy); Store.save(); render();}},
        {label:'Delete',icon:'trash',danger:true,fn:()=>{const i=st.projects.indexOf(p);st.projects.splice(i,1);Store.save();render();toast('Application deleted',{action:{label:'Undo',fn:()=>{st.projects.splice(i,0,p);Store.save();render();}}});}}
      ]);
    });
  }
  render();
};

/* ---------- Knowledge base ---------- */
KB_SCHEMA.volunteering = { ...KB_SCHEMA.roles, label: 'Volunteer work', noun: 'volunteer role', fields: KB_SCHEMA.roles.fields.map(f => f.k === 'company' ? {...f, label:'Organisation'} : f.k === 'start' || f.k === 'end' ? {...f, req:false} : f) }; // SPEC §6.1: dates optional
KB_SCHEMA.additional = {label:'Additional sections', noun:'section', fields:[{k:'title',label:'Section title',req:true},{k:'notes',label:'Details',req:true,wide:true,type:'textarea'}]};

const KB_ORDER = ['contact', 'workRights', 'roles', 'volunteering', 'portfolio', 'education', 'skills', 'credentials', 'referees', 'additional'];

function kbEntrySummary(type, e) {
  switch (type) {
    case 'additional': return { title: e.title, line: e.notes };
    case 'volunteering':
    case 'roles': return { title: e.title, sub: [e.company, e.location].filter(Boolean).join(', '), meta: [e.start, e.end].filter(Boolean).join(' to ') };
    case 'portfolio': return { title: e.name, sub: e.summary, meta: e.link };
    case 'education': return { title: e.degree, sub: e.institution, meta: e.year, line: e.notes };
    case 'skills': return { title: e.group, chips: e.items };
    case 'credentials': return { title: e.title, sub: [e.kind, e.issuer].filter(Boolean).join(', '), meta: e.year };
    case 'referees': return { title: e.name, sub: [e.title, e.company].filter(Boolean).join(', '), meta: e.contact };
    default: return { title: '' };
  }
}

function exportBackup() {
  const st = Store.state;
  const data = { app: 'instant-resume', schemaVersion: 1, exportedAt: new Date().toISOString(), knowledgeBase: st.kb, projects: st.projects, prefs: st.prefs, note: 'API keys are never included in backups.' };
  const name = `instant-resume-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(name, JSON.stringify(data, null, 2));
  toast(`Exported ${name}`);
}

function importBackup(onDone) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.knowledgeBase || !Array.isArray(data.projects)) throw new Error('missing');
      Store.state.kb = normalizeKnowledgeBase(data.knowledgeBase);
      Store.state.projects = data.projects;
      Store.saveNow();
      toast(`Imported your knowledge base and ${data.projects.length} ${data.projects.length === 1 ? 'application' : 'applications'}`);
      onDone && onDone();
    } catch (e) {
      toast("Import failed: this file isn't a Instant Resume backup", { kind: 'error' });
    }
  };
  inp.click();
}

Views.kb = function (root, params) {
  const st = Store.state;
  const active = KB_ORDER.includes(params[0]) ? params[0] : 'roles';
  const count = (t) => (KB_SCHEMA[t].single ? '' : `<span class="count">${st.kb[t].length}</span>`);
  const sch = KB_SCHEMA[active];

  let body;
  if (sch.single) {
    const e = st.kb[active];
    body = `<div class="kb-card">
      <div class="kb-card-head"><div><h3>${esc(sch.label)}</h3><div class="kb-id">${esc(e.id)}</div></div>
      <button class="btn btn-ghost btn-sm" data-edit="${e.id}">${icon('pencil', 14)} Edit</button></div>
      <dl class="kv">${sch.fields.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(e[f.k] || '') || '<span class="muted">Not set</span>'}</dd>`).join('')}</dl>
    </div>`;
  } else {
    const list = st.kb[active];
    body = list.length ? list.map((e) => {
      const s = kbEntrySummary(active, e);
      return `<div class="kb-card">
        <div class="kb-card-head">
          <div><h3>${esc(s.title)}</h3>${s.sub ? `<div class="kb-sub">${esc(s.sub)}</div>` : ''}${s.meta ? `<div class="muted small">${esc(s.meta)}</div>` : ''}</div>
          <div class="kb-actions"><span class="kb-id">${esc(e.id)}</span><button class="btn btn-ghost btn-sm" data-edit="${e.id}">${icon('pencil', 14)} Edit</button></div>
        </div>
        ${s.line ? `<p class="kb-line">${esc(s.line)}</p>` : ''}
        ${s.chips ? `<div class="chips">${s.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}
        ${e.highlights ? `<ul class="kb-highlights">${e.highlights.map((h) => `<li><span>${esc(h.text)}</span>${h.metric ? `<span class="metric">${esc(h.metric)}</span>` : ''}</li>`).join('')}</ul>` : ''}
      </div>`;
    }).join('') : `<div class="empty-state empty-sm"><h3>No ${esc(sch.label.toLowerCase())} yet</h3><p class="muted">Add one and it becomes available to every application.</p></div>`;
  }

  root.innerHTML = shell(`
    <div class="page-head">
      <div><h1>Knowledge base</h1><p class="muted">Every fact here is entered once. Resumes and cover letters can only use what's stored here.</p></div>
    </div>
    <div class="kb-layout">
      <nav class="kb-nav" aria-label="Knowledge base sections">
        ${KB_ORDER.map((t) => `<a href="#/kb/${t}" class="kb-nav-item ${t === active ? 'active' : ''}">${esc(KB_SCHEMA[t].label)}${count(t)}</a>`).join('')}
      </nav>
      <section class="kb-main">
        <div class="kb-main-head">
          <h2>${esc(sch.label)}</h2>
          ${sch.single ? '' : `<button class="btn btn-ghost btn-sm" data-add>${icon('plus', 14)} Add ${esc(sch.noun)}</button>`}
        </div>
        ${body}
      </section>
    </div>
  `, {
    route: 'kb', title: '',
    actions: `<a class="btn btn-primary" href="#/import">${icon('upload')} Import resume</a><button class="btn btn-ghost" data-import>${icon('upload')} Import backup</button><button class="btn btn-ghost" data-export>${icon('download')} Export backup</button>`,
  });
  bindShell(root);
  $('[data-export]', root).onclick = exportBackup;
  $('[data-import]', root).onclick = () => importBackup(() => Router.refresh());

  const openEditor = (entry, isNew) => {
    openModal({
      title: (isNew ? 'Add ' : 'Edit ') + (sch.noun || sch.label.toLowerCase()),
      wide: !!sch.highlights,
      body: `<form class="kb-form" novalidate>${fieldsHtml(sch, entry, 'kbf')}${sch.highlights ? highlightsEditorHtml(entry.highlights) : ''}</form>`,
      onMount: (r) => bindHighlightsEditor(r),
      actions: [
        ...(!isNew && !sch.single ? [{ label: 'Delete', kind: 'btn-danger-ghost', fn: () => {
          const i = st.kb[active].findIndex((x) => x.id === entry.id);
          st.kb[active].splice(i, 1); Store.save(); Router.refresh();
          toast('Entry deleted', { action: { label: 'Undo', fn: () => { st.kb[active].splice(i, 0, entry); Store.save(); Router.refresh(); toast('Entry restored'); } } });
        } }] : []),
        { label: 'Cancel' },
        { label: 'Save', kind: 'btn-primary', fn: (r) => {
          if (!validateFields(r, sch)) return false;
          const vals = readFields(r, sch);
          if (sch.highlights) vals.highlights = readHighlights(r, entry.highlights);
          if (sch.single) Object.assign(st.kb[active], vals);
          else if (isNew) st.kb[active].push({ id: uid(active.slice(0, 2)), ...vals });
          else Object.assign(st.kb[active].find((x) => x.id === entry.id), vals);
          Store.save(); Router.refresh(); toast('Saved to knowledge base');
        } },
      ],
    });
  };
  $$('[data-edit]', root).forEach((b) => (b.onclick = () => {
    const e = sch.single ? st.kb[active] : st.kb[active].find((x) => x.id === b.dataset.edit);
    openEditor(e, false);
  }));
  const add = $('[data-add]', root);
  if (add) add.onclick = () => openEditor({}, true);
};

/* ---------- Unlock (password-protected server, SPEC §4.1) ---------- */
Views.unlock = function (root) {
  if (!Access.locked()) { location.hash = '#/dashboard'; return; }
  root.innerHTML = `
    <div class="unlock">
      <form class="unlock-card" novalidate>
        <span class="brand-mark unlock-mark" aria-hidden="true">${icon('lock', 20)}</span>
        <h1>Unlock Instant Resume</h1>
        <p class="muted">Enter the password to continue.</p>
        <div class="field" data-field="pw">
          <label for="unlock-pw">Password</label>
          <div class="input-row"><input id="unlock-pw" type="password" autocomplete="current-password" data-pw><button class="btn btn-ghost btn-sm" type="button" data-reveal>Show</button></div>
          <div class="field-error" role="alert" hidden></div>
        </div>
        <button class="btn btn-primary btn-block" type="submit" data-unlock>Unlock</button>
        <p class="muted small unlock-mock">${icon('flask', 13)} Mock: the password is <code>${MOCK_PASSWORD}</code>. Turn the lock off in Demo controls.</p>
      </form>
    </div>`;
  const form = $('form', root), pw = $('[data-pw]', root), btn = $('[data-unlock]', root);
  const err = $('[data-field="pw"] .field-error', root);
  const show = (msg) => { err.textContent = msg; err.hidden = !msg; $('[data-field="pw"]', root).classList.toggle('has-error', !!msg); };
  let tick = null;
  const cooldown = () => {
    const left = Math.ceil((Access.attempts().until - Date.now()) / 1000);
    btn.disabled = left > 0;
    if (left > 0) show(`Too many attempts. Try again in ${left} ${left === 1 ? 'second' : 'seconds'}.`);
    else { clearInterval(tick); tick = null; show(''); }
  };
  if (Access.attempts().until > Date.now()) { cooldown(); tick = setInterval(cooldown, 1000); }
  $('[data-reveal]', root).onclick = (e) => { pw.type = pw.type === 'password' ? 'text' : 'password'; e.target.textContent = pw.type === 'password' ? 'Show' : 'Hide'; };
  pw.oninput = () => { if (!tick) show(''); };
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    if (!pw.value) { show('Enter the password'); pw.focus(); return; }
    btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-light"></span> Unlocking';
    await sleep(500);
    btn.innerHTML = 'Unlock';
    if (pw.value === MOCK_PASSWORD) {
      Access.unlock();
      if (Router.parse().name === 'unlock') location.hash = '#/dashboard'; else Router.refresh();
      toast('Unlocked on this device');
      return;
    }
    btn.disabled = false;
    pw.select();
    if (Access.fail().until) { cooldown(); tick = setInterval(cooldown, 1000); } else show("That password isn't right.");
  };
  setTimeout(() => pw.focus(), 50);
  return () => clearInterval(tick);
};

function accessSettingsHtml(st) {
  const on = !!st.demo.passwordLock;
  return `
    <section class="settings-section">
      <h2>Access</h2>
      <div class="pref-list"><div class="pref">
        <div>
          <strong>${on ? 'Password lock is on' : 'Local only'}</strong> <span class="pill ${on ? 'pill-ok' : ''}">${icon(on ? 'lock' : 'shield', 12)} ${on ? 'Protected' : 'This computer only'}</span>
          <div class="muted small access-text">${on
            ? 'This copy runs on a server. Anyone who opens it needs the password. Each device stays unlocked for 30 days, or until you lock it.'
            : 'Instant Resume only accepts connections from this computer, so no password is needed. To use it from another device, run it on your server with APP_PASSWORD set and HTTPS. A private network such as Tailscale is safer still.'}</div>
          ${on ? '<div class="muted small access-text">To change the password, set a new <code>APP_PASSWORD</code> on the server and restart. That signs out every device.</div>' : ''}
        </div>
        ${on ? `<button class="btn btn-ghost btn-sm" data-lock-now>${icon('lock', 14)} Lock now</button>` : ''}
      </div></div>
    </section>`;
}

/* ---------- Settings ---------- */
Views.settings = function (root) {
  const st = Store.state;
  const card = (p) => {
    const c = st.connections[p.id];
    const isActive = st.activeModel.provider === p.id;
    if (c) {
      return `<div class="conn-card" data-prov="${p.id}">
        <div class="conn-head"><span class="prov-dot prov-${p.id}"></span><h3>${esc(p.name)}</h3>${isActive ? '<span class="pill pill-ok">In use</span>' : ''}</div>
        <div class="conn-key">${icon('key', 15)} <code>${esc(c.masked)}</code><span class="muted small">Encrypted on this device</span></div>
        <div class="field"><label for="m-${p.id}">Default model</label><select id="m-${p.id}" data-model-sel>${p.models.map((m) => `<option ${m === c.model ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="conn-actions">
          ${isActive ? '' : `<button class="btn btn-ghost btn-sm" data-use>Use ${esc(p.name)}</button>`}
          <button class="btn btn-danger-ghost btn-sm" data-remove>Remove key</button>
        </div>
      </div>`;
    }
    return `<div class="conn-card conn-empty" data-prov="${p.id}">
      <div class="conn-head"><span class="prov-dot prov-none"></span><h3>${esc(p.name)}</h3><span class="muted small">Not connected</span></div>
      <div class="field" data-field="key">
        <label for="k-${p.id}">API key</label>
        <div class="input-row"><input id="k-${p.id}" type="password" placeholder="${esc(p.prefix)}…" autocomplete="off" data-key><button class="btn btn-ghost btn-sm" data-reveal type="button">Show</button></div>
        <div class="field-error" hidden></div>
        <div class="field-ok" hidden></div>
      </div>
      <div class="field"><label for="m-${p.id}">Model</label><select id="m-${p.id}" data-model-sel>${p.models.map((m) => `<option>${m}</option>`).join('')}</select></div>
      <div class="conn-actions"><button class="btn btn-primary btn-sm" data-test>Test and save</button></div>
      <p class="muted small">The key is checked with a small test call, then stored encrypted in this browser. It's never sent to our server or included in backups.</p>
    </div>`;
  };

  root.innerHTML = shell(`
    <div class="page-head"><div><h1>Settings</h1><p class="muted">Connections, preferences and your data.</p></div></div>
    <section class="settings-section">
      <h2>Connections</h2>
      <p class="muted">Bring your own API key. You pay your provider directly; switching models is one click from the top bar.</p>
      <details class="key-guide">
        <summary>${icon('key', 15)} How to get an API key</summary>
        <ol>
          <li>Sign in to your provider's developer site: ${MOCK.providers.map((p) => `<a href="${p.keyUrl}" target="_blank" rel="noopener noreferrer">${esc(p.name)} ${icon('external', 12)}</a>`).join(', ')}.</li>
          <li>Create a new API key and copy all of it.</li>
          <li>Paste it into that provider's card below and choose <strong>Test and save</strong>.</li>
        </ol>
        <p class="muted small">API usage is billed by the provider, separately from chat subscriptions. Some providers offer a free tier; check their current pricing. One application usually uses a few thousand tokens.</p>
      </details>
      <div class="conn-grid">${MOCK.providers.map(card).join('')}</div>
    </section>
    ${quickSettingsHtml()}
    <section class="settings-section">
      <h2>Preferences</h2>
      <div class="pref-list">
        <div class="pref"><div><strong>Paper size</strong><div class="muted small">Used for preview and export</div></div>
          <div class="seg" data-pref="paper">${['A4', 'Letter'].map((v) => `<button class="${st.prefs.paper === v ? 'on' : ''}" data-v="${v}">${v}</button>`).join('')}</div></div>
        <div class="pref"><div><strong>Spelling and conventions</strong><div class="muted small">Australian adds work rights and referees to resumes</div></div>
          <div class="seg" data-pref="spelling">${[['en-AU', 'Australian'], ['en-US', 'US']].map(([v, l]) => `<button class="${st.prefs.spelling === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div></div>
      </div>
    </section>
    ${instructionsSettingsHtml(st)}
    <section class="settings-section">
      <h2>Your data</h2>
      <p class="muted">Everything lives in a database file on this machine. Export a backup regularly; API keys are left out.</p>
      <div class="row-gap"><button class="btn btn-ghost" data-export>${icon('download')} Export backup</button><button class="btn btn-ghost" data-import>${icon('upload')} Import backup</button><button class="btn btn-danger-ghost" data-wipe>${icon('trash')} Delete knowledge base</button></div>
    </section>
    ${accessSettingsHtml(st)}
  `, { route: 'settings', title: '' });
  bindShell(root);
  const lockNow = $('[data-lock-now]', root);
  if (lockNow) lockNow.onclick = () => { Access.lock(); Router.refresh(); toast('Locked. Enter the password to continue.'); };

  $('[data-export]', root).onclick = exportBackup;
  $('[data-import]', root).onclick = () => importBackup(() => Router.refresh());
  $('[data-wipe]', root).onclick = () => openModal({
    title: 'Delete your knowledge base?',
    body: '<p>Every entry goes: contact, experience, skills and the rest. Your applications stay. Export a backup first if you might want it back.</p>',
    actions: [{ label: 'Cancel' }, { label: 'Delete knowledge base', kind: 'btn-danger-ghost', fn: () => { st.kb = normalizeKnowledgeBase({}); st.sampleKb = false; Store.save(); toast('Knowledge base deleted'); location.hash = '#/onboarding'; } }],
  });

  bindQuickSettings(root);
  bindInstructions(root, st);
  $$('[data-pref]', root).forEach((seg) => $$('button', seg).forEach((b) => (b.onclick = () => {
    st.prefs[seg.dataset.pref] = b.dataset.v; Store.save();
    $$('button', seg).forEach((x) => x.classList.toggle('on', x === b));
    toast('Preference saved');
  })));

  $$('.conn-card', root).forEach((cardEl) => {
    const p = MOCK.providers.find((x) => x.id === cardEl.dataset.prov);
    const c = st.connections[p.id];
    const sel = $('[data-model-sel]', cardEl);
    if (c) {
      sel.onchange = () => { c.model = sel.value; if (st.activeModel.provider === p.id) st.activeModel.model = sel.value; Store.save(); Router.refresh(); };
      const use = $('[data-use]', cardEl);
      if (use) use.onclick = () => { st.activeModel = { provider: p.id, model: c.model }; Store.save(); Router.refresh(); toast('Now using ' + c.model); };
      $('[data-remove]', cardEl).onclick = () => {
        delete st.connections[p.id];
        if (st.activeModel.provider === p.id) {
          const other = Object.keys(st.connections)[0];
          st.activeModel = other ? { provider: other, model: st.connections[other].model } : { provider: p.id, model: '' };
        }
        Store.save(); Router.refresh(); toast(p.name + ' key removed');
      };
      return;
    }
    const keyIn = $('[data-key]', cardEl);
    const err = $('.field-error', cardEl);
    const okEl = $('.field-ok', cardEl);
    const showErr = (m) => { err.textContent = m; err.hidden = !m; $('[data-field="key"]', cardEl).classList.toggle('has-error', !!m); };
    $('[data-reveal]', cardEl).onclick = (e) => { keyIn.type = keyIn.type === 'password' ? 'text' : 'password'; e.target.textContent = keyIn.type === 'password' ? 'Show' : 'Hide'; };
    keyIn.oninput = () => showErr('');
    $('[data-test]', cardEl).onclick = async (e) => {
      const k = keyIn.value.trim();
      const wrongPrefix = !k.startsWith(p.prefix) || (p.id === 'openai' && k.startsWith('sk-ant-'));
      if (!k) return showErr('Paste your API key first');
      if (wrongPrefix) return showErr(`That doesn't look like ${/^[AEIOU]/.test(p.name) ? 'an' : 'a'} ${p.name} key. ${p.name} keys start with "${p.prefix}".`);
      if (k.length < 20) return showErr('That key looks too short. Copy the whole key from your provider dashboard.');
      const btn = e.currentTarget;
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Testing key…';
      await sleep(1400);
      if (/bad|invalid|wrong/i.test(k)) {
        btn.disabled = false; btn.textContent = 'Test and save';
        return showErr(`${p.name} rejected this key (401 invalid_api_key). Check the key is active and copied in full.`);
      }
      okEl.hidden = false; okEl.innerHTML = `${icon('check', 14)} Key works. Saved and encrypted on this device.`;
      await sleep(700);
      st.connections[p.id] = { masked: k.slice(0, p.prefix.length) + '…' + k.slice(-4), model: sel.value, addedAt: Date.now() };
      if (!st.connections[st.activeModel.provider] || !st.activeModel.model) st.activeModel = { provider: p.id, model: sel.value };
      Store.save(); Router.refresh(); toast(p.name + ' connected');
    };
  });
};


// Settings → Writing instructions and Built-in prompts (SPEC §13.3 items 4–5, §8.3). The user's instructions sit on
// top of the read-only prompts; the mock keeps them in st.prefs.instructions (the real app sends them to the model).
const INSTRUCTION_TARGETS = { resume: 'Whole resume', summary: 'Summary', experience: 'Experience', portfolio: 'Projects', skills: 'Skills', coverLetter: 'Cover letter' };
const INSTRUCTION_EXAMPLES = [
  ['experience', 'Keep every bullet under 20 words and start it with a strong verb.'],
  ['summary', 'Open with my current job title and keep it to two sentences.'],
  ['skills', 'Put the tools named in the job ad first.'],
  ['coverLetter', 'Keep it under 250 words and sound conversational.'],
];
const BUILT_IN_PROMPTS = [
  ['Import', 'sorts an uploaded resume into your knowledge base', 'You sort a resume into the requested JSON structure.\n- Copy facts only from the resume. Never invent or infer anything.\n- Text copied from a PDF wraps long bullets onto several lines: join a wrapped line back onto its bullet…'],
  ['Job brief', 'reads the job description', 'You read a job ad and return its job brief as JSON…'],
  ['Matching', 'links each must-have to your experience', "You match a job's must-haves to evidence in a candidate's knowledge base and return JSON…"],
  ['Writing', 'writes the resume and cover letter', "You tailor a resume and cover letter to a job…\n- Use only facts in the knowledge base.\n- The user's own instructions, when given, may change wording, emphasis, length and order. They never override the rules above: facts, sources, numbers and banned phrases still apply."],
  ['Rewrite', 'rewrites one section in Studio', 'You rewrite one section of a resume or cover letter as the user asks…'],
];

function instructionsBoxHtml(list) {
  const row = (i, n) => `<div class="pref ins-row" data-ins="${n}" style="align-items:flex-start">
      <select class="pref-select" aria-label="Instruction ${n + 1} applies to" data-ins-target>${Object.entries(INSTRUCTION_TARGETS).map(([v, l]) => `<option value="${v}" ${i.target === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <textarea rows="2" maxlength="600" style="flex:1" aria-label="Instruction ${n + 1}" placeholder="For example: keep every bullet under 20 words." data-ins-text>${esc(i.text)}</textarea>
      <button class="icon-btn" aria-label="Remove instruction ${n + 1}" title="Remove" data-ins-remove>${icon('x', 15)}</button></div>`;
  const empty = `<div class="pref" style="flex-direction:column;align-items:flex-start"><span class="muted">No instructions yet. Start from an example or write your own.</span>
    <div class="chips">${INSTRUCTION_EXAMPLES.map(([t, x], k) => `<button class="chip chip-btn" data-ins-example="${k}"><strong>${INSTRUCTION_TARGETS[t]}:</strong> ${esc(x)}</button>`).join('')}</div></div>`;
  return `${list.length ? list.map(row).join('') : empty}
    <div class="pref"><button class="btn btn-ghost btn-sm" data-ins-add ${list.length >= 12 ? 'disabled' : ''}>${icon('plus', 14)} Add instruction</button><button class="btn btn-primary btn-sm" data-ins-save>Save instructions</button></div>`;
}

function instructionsSettingsHtml(st) {
  return `
    <section class="settings-section">
      <h2>Writing instructions</h2>
      <p class="muted">Your own instructions, added on top of the built-in prompts whenever a resume or cover letter is written or rewritten. They can change wording, emphasis and length, never the facts.</p>
      <div class="pref-list" data-ins-box>${instructionsBoxHtml(st.prefs.instructions || [])}</div>
    </section>
    <section class="settings-section">
      <h2>Built-in prompts</h2>
      <p class="muted">The instructions sent to your model at each step. They keep every resume factual, so they can't be edited; your writing instructions above are added to Writing and Rewrite.</p>
      <div class="pref-list">${BUILT_IN_PROMPTS.map(([name, use, text]) => `<details class="disclosure pref" style="display:block"><summary><strong>${name}</strong> <span class="muted">· ${use}</span></summary>
        <pre tabindex="0" aria-label="${name} prompt" style="white-space:pre-wrap;max-height:320px;overflow:auto;margin:10px 0 0;padding:12px;background:var(--sunken);border:1px solid var(--line);border-radius:var(--r-md);font:12px/1.6 ui-monospace,monospace;color:var(--ink-2)">${esc(text)}</pre></details>`).join('')}</div>
    </section>`;
}

function bindInstructions(root, st) {
  const box = $('[data-ins-box]', root);
  let draft = (st.prefs.instructions || []).map((i) => ({ ...i }));
  const read = () => $$('[data-ins]', box).forEach((r) => { const i = draft[+r.dataset.ins]; i.target = $('[data-ins-target]', r).value; i.text = $('[data-ins-text]', r).value; });
  const render = () => {
    box.innerHTML = instructionsBoxHtml(draft);
    $$('[data-ins-example]', box).forEach((b) => (b.onclick = () => { const [target, text] = INSTRUCTION_EXAMPLES[+b.dataset.insExample]; draft.push({ target, text }); render(); }));
    $('[data-ins-add]', box).onclick = () => { read(); draft.push({ target: 'resume', text: '' }); render(); };
    $$('[data-ins-remove]', box).forEach((b) => (b.onclick = () => { read(); draft.splice(+b.closest('[data-ins]').dataset.ins, 1); render(); }));
    $('[data-ins-save]', box).onclick = () => {
      read();
      st.prefs.instructions = draft.map((i) => ({ ...i, text: i.text.trim() })).filter((i) => i.text);
      Store.save(); toast('Instructions saved');
      draft = st.prefs.instructions.map((i) => ({ ...i })); render();
    };
  };
  render();
}

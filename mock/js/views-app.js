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
    return { id, text, metric: $('[name="hl-metric"]', r).value.trim(), skills: old ? old.skills : Docs.matchedKeywords(text, MOCK.jds.flatMap((j) => j.brief.keywords)) };
  }).filter(Boolean);
}

/* ---------- Dashboard ---------- */
function monogram(name) {
  const hues = [168, 212, 330, 28, 260, 120];
  const h = hues[name.charCodeAt(0) % hues.length];
  return `<span class="monogram" style="--h:${h}">${esc(name.charAt(0))}</span>`;
}

/* Applications home: one compact, sortable list. A row is one application (one job).
   Stage tabs with counts replace summary charts; "Needs you" replaces the old Up next panel.
   The funnel and other charts live in Career map. */
const HOME_TABS = [
  ['needs', 'Needs you', 'Applications with something for you to do now'],
  ['all', 'All', 'Every application'],
  ['draft', 'Drafts', 'Documents ready or in progress, not sent yet'],
  ['sent', 'Sent', 'Sent and waiting on a reply'],
  ['interview', 'Interviewing', 'Interviews and offers'],
  ['closed', 'Closed', 'Rejected or no reply'],
];
const HOME_PAGE = 25;

function nextStepFor(row) {
  const days = row.sentAt ? (Date.now() - row.sentAt) / 864e5 : 0;
  const dateIn = (d) => new Date(Date.now() + d * 864e5).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  switch (row.stage) {
    case 'draft':
      return row.findings ? { text: `Fix ${row.findings} ${row.findings === 1 ? 'issue' : 'issues'}`, tone: 'warn', needs: true } : { text: 'Ready to send', tone: 'accent', needs: true };
    case 'applied':
      if (row.warm) return { text: `Ask ${row.warm.split(' ')[0]} for ${row.warmAsk === 'intro' ? 'an intro' : 'a referral'}`, tone: 'accent', needs: true };
      if (days >= 21) return { text: 'Probably no reply', tone: 'muted', needs: false };
      if (days >= 7) return { text: 'Follow up now', tone: 'warn', needs: true };
      return { text: `Follow up ${dateIn(7 - days)}`, tone: '', needs: false };
    case 'interview': return { text: 'Prepare for interview', tone: 'accent', needs: true };
    case 'offer': return { text: 'Decide on the offer', tone: 'accent', needs: true };
    default: return { text: '', tone: 'muted', needs: false };
  }
}

function homeRows() {
  const st = Store.state;
  const r = insightState();
  const rows = st.projects.map((p) => {
    const stage = appStage(p);
    const job = appJob(p);
    const warm = stage === 'applied' ? peopleFor(job).find((x) => x.degree === 1) : null;
    const contacted = Object.values(r.outreach[job.id] || {}).some((v) => v !== 'none');
    const j = projectJob(p);
    return {
      key: p.id, company: p.company, title: p.role, stage, docs: true,
      sentAt: stage === 'draft' ? null : appSentAt(p), updated: p.updatedAt,
      href: stage === 'draft' ? `#/project/${p.id}` : `#/project/${p.id}/overview`,
      findings: stage === 'draft' ? Docs.runChecks(p, 'resume', st.kb).findings.length : 0,
      warm: warm && !contacted ? warm.name : null, warmAsk: warm && warm.ask, src: j && j.platform,
    };
  });
  JOBS_MOCK.history.filter((a) => !st.projects.some((p) => p.company === a.projectRef)).forEach((a) => {
    const at = Date.now() - a.daysAgo * 864e5;
    rows.push({ key: a.id, company: a.company, title: a.title, stage: a.status, docs: false, sentAt: at, updated: at, href: '' });
  });
  if (st.demo.bulkApps) rows.push(...bulkSampleRows());
  rows.forEach((x) => (x.next = nextStepFor(x)));
  return rows;
}

// Demo only: lots of applications, to see how the list holds up at 200+
function bulkSampleRows() {
  const cos = ['Atlas Freight', 'Bramble', 'Cobalt Labs', 'Driftwood', 'Ember Health', 'Fernway', 'Gumtree Digital', 'Halcyon', 'Ironbark', 'Juniper Pay', 'Kestrel', 'Lantern', 'Mosaic Bank', 'Northwind', 'Opal Energy', 'Pikelet', 'Quill', 'Riverstone', 'Saltbush', 'Tern Analytics'];
  const roles = ['Senior Frontend Engineer', 'Full Stack Engineer', 'Senior Software Engineer', 'Lead Engineer', 'Frontend Developer', 'Platform Engineer'];
  const stages = ['applied', 'applied', 'applied', 'ghosted', 'ghosted', 'rejected', 'rejected', 'interview', 'draft', 'applied', 'ghosted', 'offer'];
  return Array.from({ length: 220 }, (_, i) => {
    const days = (i * 37) % 60;
    const at = Date.now() - days * 864e5 - i * 3600e3;
    return { key: 'bulk-' + i, company: cos[i % cos.length] + (i >= cos.length ? ' ' + (Math.floor(i / cos.length) + 1) : ''), title: roles[(i * 7) % roles.length], stage: stages[(i * 5) % stages.length], docs: false, sentAt: stages[(i * 5) % stages.length] === 'draft' ? null : at, updated: at, href: '', sample: true };
  });
}

const tabMatch = (tab, x) => tab === 'all' ? true : tab === 'needs' ? x.next.needs : tab === 'draft' ? x.stage === 'draft' : tab === 'sent' ? x.stage === 'applied' : tab === 'interview' ? ['interview', 'offer'].includes(x.stage) : ['rejected', 'ghosted'].includes(x.stage);

function sentCell(x) {
  if (!x.sentAt) return '<span class="muted">Not sent</span>';
  const d = Math.floor((Date.now() - x.sentAt) / 864e5);
  const age = x.stage !== 'applied' ? '' : d >= 21 ? 'cold' : d >= 7 ? 'follow' : 'wait';
  const tip = age === 'cold' ? 'Over 3 weeks: most employers that reply do so by now' : age === 'follow' ? 'A week or more: a short follow-up helps' : age === 'wait' ? 'Too early to chase' : '';
  return `<span class="al-age ${age ? 'al-age-' + age : ''}" ${tip ? `data-tip="${tip}"` : ''}>${d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago'}</span>`;
}

Views.dashboard = function (root) {
  const st = Store.state;
  insightState();
  const ui = (st.homeUi = st.homeUi || { tab: null, sort: 'updated', dir: -1, q: '' });
  let limit = HOME_PAGE;
  const strong = jobsState().jobs.filter((j) => j.status === 'new' && j.score >= 85).length;

  function render() {
    const all = st.demo.emptyDashboard ? [] : homeRows();
    const counts = Object.fromEntries(HOME_TABS.map(([k]) => [k, all.filter((x) => tabMatch(k, x)).length]));
    if (!ui.tab) ui.tab = counts.needs ? 'needs' : 'all';
    const q = ui.q.toLowerCase().trim();
    const order = { draft: 0, applied: 1, interview: 2, offer: 3, rejected: 4, ghosted: 5 };
    const key = { company: (x) => x.company.toLowerCase(), stage: (x) => order[x.stage], sent: (x) => x.sentAt || Infinity, updated: (x) => x.updated }[ui.sort];
    const rows = all.filter((x) => tabMatch(ui.tab, x) && (!q || (x.company + ' ' + x.title).toLowerCase().includes(q)))
      .sort((a, b) => {
        if (ui.sort === 'sent' && !a.sentAt !== !b.sentAt) return a.sentAt ? -1 : 1; // unsent drafts always last
        const A = key(a), B = key(b); return (A < B ? -1 : A > B ? 1 : 0) * ui.dir;
      });
    const shown = rows.slice(0, limit);
    const th = (k, label) => `<button class="al-th ${ui.sort === k ? 'on' : ''}" data-sort="${k}" aria-label="Sort by ${label.toLowerCase()}">${label}${ui.sort === k ? `<span class="al-dir">${ui.dir > 0 ? '↑' : '↓'}</span>` : ''}</button>`;
    const banner = !st.dismissedOnboardingBanner ? `
      <div class="banner">
        ${icon('book', 18)}
        <div><strong>Your knowledge base is filled with sample data.</strong> Walk through onboarding to see how a new user would build theirs.</div>
        <a class="btn btn-sm btn-ghost" href="#/onboarding">Start onboarding</a>
        <button class="icon-btn" data-dismiss aria-label="Dismiss">${icon('x', 15)}</button>
      </div>` : '';

    root.innerHTML = shell(`
      ${banner}
      <div class="page-head al-head">
        <div><h1>Applications</h1><p class="muted">One per job: the ad, your resume and cover letter, and what happened after you sent it.</p></div>
        ${all.length ? `<div class="search"><span>${icon('search', 15)}</span><input type="search" placeholder="Search company or role" data-search value="${esc(ui.q)}" aria-label="Search applications"></div>` : ''}
      </div>
      ${all.length ? `
      <div class="al-bar">
        <div class="al-tabs" role="tablist" aria-label="Show">${HOME_TABS.map(([k, l, tip]) => `<button role="tab" aria-selected="${ui.tab === k}" class="al-tab ${ui.tab === k ? 'on' : ''} ${k === 'needs' && counts.needs ? 'al-tab-needs' : ''}" data-tab="${k}" data-tip="${tip}">${l} <span class="count ${k === 'needs' && counts.needs ? 'count-warn' : ''}">${counts[k]}</span></button>`).join('')}</div>
        ${strong ? `<a class="al-matches" href="#/jobs" data-tip="Jobs your sweeps found that scored 85 or more">${icon('radar', 14)} ${strong} strong ${strong === 1 ? 'match' : 'matches'} waiting</a>` : ''}
      </div>
      ${rows.length ? `
      <div class="al" role="table" aria-label="Applications">
        <div class="al-row al-hrow" role="row">${th('company', 'Company and role')}${th('stage', 'Stage')}${th('sent', 'Sent')}<span class="al-th al-th-static">Next step</span>${th('updated', 'Last change')}<span></span></div>
        ${shown.map((x, i) => `
        <div class="al-row ${x.href ? 'al-link' : 'al-nodoc'}" role="row" ${x.href ? `data-href="${x.href}" tabindex="0"` : ''} style="--i:${Math.min(i, 12)}">
          <span class="al-co" role="cell">${monogram(x.company)}<span class="al-co-txt"><strong>${esc(x.company)}</strong><span class="muted">${esc(x.title)}</span></span>${x.src ? `<span data-tip="Found by your sweeps on ${esc(platformOf(x.src).name)}">${platformBadge(x.src)}</span>` : ''}</span>
          <span role="cell">${x.docs ? stageSelect(Store.project(x.key), `data-row-stage="${x.key}"`) : `<span class="al-stage-static stage-${x.stage}" data-tip="${x.sample ? 'Sample row (Demo controls)' : 'Sent before this app, so there are no documents to open'}"><span class="stage-dot"></span>${STATUS_LABEL[x.stage]}</span>`}</span>
          <span role="cell" class="al-sent">${sentCell(x)}</span>
          <span role="cell" class="al-next al-next-${x.next.tone || 'plain'}">${esc(x.next.text)}</span>
          <span role="cell" class="al-upd muted">${timeAgo(x.updated)}</span>
          <span role="cell">${x.docs ? `<button class="icon-btn" data-row-menu="${x.key}" aria-haspopup="menu" aria-expanded="false" aria-label="More for ${esc(x.company)}" data-tip="Open documents, overview, duplicate, delete">${icon('dots', 16)}</button>` : ''}</span>
        </div>`).join('')}
      </div>
      <div class="al-foot">
        <span class="muted small">Showing ${shown.length} of ${rows.length}</span>
        ${rows.length > shown.length ? `<button class="btn btn-ghost btn-sm" data-more>Show ${Math.min(HOME_PAGE, rows.length - shown.length)} more</button>` : ''}
      </div>` : `
      <div class="al-empty"><p class="muted">${q ? `No applications match "${esc(ui.q)}".` : ui.tab === 'needs' ? 'Nothing needs you right now.' : 'Nothing here yet.'}</p>${q ? '<button class="btn btn-ghost btn-sm" data-clear>Clear search</button>' : ui.tab !== 'all' ? '<button class="btn btn-ghost btn-sm" data-tab="all">Show all</button>' : ''}</div>`}` : `
      <div class="empty-state">
        <div class="empty-icon">${icon('file', 28)}</div>
        <h3>No applications yet</h3>
        <p class="muted">An application holds one job's ad, your tailored resume and cover letter, and everything that happens after you send it.</p>
        <div class="row-gap center"><a class="btn btn-primary" href="#/new">${icon('plus')} New application</a><a class="btn btn-ghost" href="#/jobs">Find jobs</a></div>
      </div>`}
    `, { route: 'dashboard', title: '', actions: `<a class="btn btn-primary" href="#/new">${icon('plus')} New application</a>` });
    bindShell(root);
    bind();
  }

  function bind() {
    const d = $('[data-dismiss]', root);
    if (d) d.onclick = () => { st.dismissedOnboardingBanner = true; Store.save(); $('.banner', root).remove(); };
    $$('[data-tab]', root).forEach((b) => (b.onclick = () => { ui.tab = b.dataset.tab; limit = HOME_PAGE; Store.save(); render(); }));
    $$('[data-sort]', root).forEach((b) => (b.onclick = () => { const k = b.dataset.sort; ui.dir = ui.sort === k ? -ui.dir : k === 'company' || k === 'stage' ? 1 : -1; ui.sort = k; Store.save(); render(); $(`[data-sort="${k}"]`, root).focus(); }));
    const s = $('[data-search]', root);
    if (s) s.oninput = debounce(() => { ui.q = s.value; limit = HOME_PAGE; render(); const n = $('[data-search]', root); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 150);
    const c = $('[data-clear]', root);
    if (c) c.onclick = () => { ui.q = ''; render(); };
    const m = $('[data-more]', root);
    if (m) m.onclick = () => { limit += HOME_PAGE; render(); };
    $$('[data-href]', root).forEach((row) => {
      const go = () => (location.hash = row.dataset.href);
      row.addEventListener('click', (e) => { if (!e.target.closest('select, button, label')) go(); });
      row.addEventListener('keydown', (e) => {
        if (e.target !== row) return;
        if (e.key === 'Enter') go();
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const rs = $$('[data-href]', root); const i = rs.indexOf(row); (rs[i + (e.key === 'ArrowDown' ? 1 : -1)] || row).focus(); }
      });
    });
    $$('[data-row-stage]', root).forEach((sel) => (sel.onchange = () => { setAppStage(Store.project(sel.dataset.rowStage), sel.value); Store.saveNow(); render(); }));
    $$('[data-row-menu]', root).forEach((b) => (b.onclick = () => {
      const p = Store.project(b.dataset.rowMenu);
      openMenu(b, [
        { label: 'Open documents', icon: 'file', fn: () => (location.hash = '#/project/' + p.id) },
        { label: 'Open overview', icon: 'eye', fn: () => (location.hash = `#/project/${p.id}/overview`) },
        { label: 'Duplicate', icon: 'copy', fn: () => { const c2 = clone(p); c2.id = uid('p'); c2.role = p.role + ' (copy)'; c2.updatedAt = Date.now(); delete c2.sent; delete c2.status; delete c2.jobId; st.projects.push(c2); Store.save(); render(); toast('Application duplicated'); } },
        '-',
        { label: 'Delete', icon: 'trash', danger: true, fn: () => {
          const idx = st.projects.indexOf(p);
          st.projects.splice(idx, 1); Store.save(); render();
          toast('Application deleted', { action: { label: 'Undo', fn: () => { st.projects.splice(idx, 0, p); Store.save(); render(); } } });
        } },
      ]);
    }));
  }

  render();
};

/* ---------- Knowledge base ---------- */
const KB_ORDER = ['contact', 'workRights', 'roles', 'portfolio', 'education', 'skills', 'credentials', 'referees'];

function kbEntrySummary(type, e) {
  switch (type) {
    case 'roles': return { title: e.title, sub: `${e.company}, ${e.location}`, meta: `${e.start} to ${e.end}` };
    case 'portfolio': return { title: e.name, sub: e.summary, meta: e.link };
    case 'education': return { title: e.degree, sub: e.institution, meta: e.year, line: e.notes };
    case 'skills': return { title: e.group, chips: e.items };
    case 'credentials': return { title: e.title, sub: `${e.kind}, ${e.issuer}`, meta: e.year };
    case 'referees': return { title: e.name, sub: [e.title, e.company].filter(Boolean).join(', '), meta: e.contact };
    default: return { title: '' };
  }
}

function exportBackup() {
  const st = Store.state;
  const data = { app: 'resume-tailor', schemaVersion: 1, exportedAt: new Date().toISOString(), knowledgeBase: st.kb, projects: st.projects, note: 'API keys are never included in backups.' };
  const name = `resume-tailor-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
      Store.state.kb = data.knowledgeBase;
      Store.state.projects = data.projects;
      Store.saveNow();
      toast(`Imported your knowledge base and ${data.projects.length} projects`);
      onDone && onDone();
    } catch (e) {
      toast("Import failed: this file isn't a Resume Tailor backup", { kind: 'error' });
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
    }).join('') : `<div class="empty-state empty-sm"><h3>No ${esc(sch.label.toLowerCase())} yet</h3><p class="muted">Add one and it becomes available to every project.</p></div>`;
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
    actions: `<button class="btn btn-ghost" data-import>${icon('upload')} Import</button><button class="btn btn-ghost" data-export>${icon('download')} Export backup</button>`,
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
          st.kb[active] = st.kb[active].filter((x) => x.id !== entry.id); Store.save(); Router.refresh(); toast('Entry deleted');
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
    <section class="settings-section">
      <h2>Your data</h2>
      <p class="muted">Everything lives in a database file on this machine. Export a backup regularly; API keys are left out.</p>
      <div class="row-gap"><button class="btn btn-ghost" data-export>${icon('download')} Export backup</button><button class="btn btn-ghost" data-import>${icon('upload')} Import backup</button></div>
    </section>
  `, { route: 'settings', title: '' });
  bindShell(root);

  $('[data-export]', root).onclick = exportBackup;
  $('[data-import]', root).onclick = () => importBackup(() => Router.refresh());

  bindQuickSettings(root);
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

/* Listing check (is this job real?), application records (saved automatically when you apply),
   people to contact, the Applications tab, and resume experiments.
   Charts here are small inline SVGs: crisp at any size, themable through CSS variables, and
   readable without hovering. Hover tooltips (data-tip) add the detail. */

/* ---------- Seed data for this pass (lazy, so older saved state picks it up once) ---------- */
function insightState() {
  const r = jobsState();
  // Applications sent under the earlier model kept their copy on the job; move it onto the application
  if (!r.v3) {
    r.v3 = true;
    r.jobs.forEach((j) => {
      const p = j.snapshot && j.projectId && Store.project(j.projectId);
      if (p && !p.sent) { p.sent = j.snapshot; if (!p.status && j.status !== 'tailored') p.status = j.status; }
    });
  }
  if (r.v2) return r;
  r.v2 = true;
  r.checked = r.checked || {};
  r.outreach = r.outreach || {};
  r.experiments = clone(INSIGHT_MOCK.experiments);
  if (!r.jobs.find((j) => j.id === 'job-nimbus')) {
    const n = clone(INSIGHT_MOCK.nimbusJob);
    n.text = JOBS_MOCK.jdText(n);
    n.foundAt = Date.now() - n.hoursAgo * 3600e3;
    r.jobs.push(n);
  }
  // One application already sent 6 days ago, so the record and follow-up flow have something to show
  const dta = r.jobs.find((j) => j.id === 'job-dta');
  if (dta && dta.status === 'new' && !dta.projectId) {
    dta.foundAt = Date.now() - 9 * 864e5;
    const p = makeProjectForJob(dta);
    p.createdAt = p.updatedAt = Date.now() - 7 * 864e5;
    p.variant = { exp: 'exp-summary', key: 'B' };
    setAppStage(p, 'applied', { at: Date.now() - 6 * 864e5, quiet: true });
  }
  Store.save();
  return r;
}

/* ---------- Small SVG helpers ---------- */
const svgEsc = esc;
function svg(w, h, body, cls = '', label = '') {
  // Natural size, shrinking on narrow screens but never scaling text up on wide ones
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" style="max-width:100%;height:auto" preserveAspectRatio="xMinYMin meet" role="img" aria-label="${svgEsc(label)}">${body}</svg>`;
}

/* ---------- Listing check ---------- */
const VERDICT = {
  real: { label: 'Looks real', cls: 'ok', icon: 'shield' },
  doubt: { label: 'Some doubts', cls: 'warn', icon: 'alert' },
  fake: { label: 'Likely fake', cls: 'bad', icon: 'alert' },
};

function listingCheck(job) {
  const co = INSIGHT_MOCK.companies[job.company] || { headcount: [50, 51, 52, 52, 53, 54, 55, 55, 56, 57, 58, 58], openings: [1, 1, 2, 1, 2, 2, 1, 2, 2, 2, 3, 2], layoffs: null, careersPage: true, track: { posted: 8, filled: 7, medianDays: 40 } };
  const ageDays = Math.max(0.3, (Date.now() - (job.foundAt || Date.now())) / 864e5);
  const posts = INSIGHT_MOCK.postings[job.id] || [{ p: job.platform, posts: [ageDays], text: 'same' }];
  const content = INSIGHT_MOCK.content[job.id] || { specific: true };
  const first = Math.max(...posts.flatMap((x) => x.posts));
  const reposts = posts.reduce((a, x) => a + x.posts.length - 1, 0);
  const days = (d) => (d < 1 ? 'today' : `${Math.round(d)} ${Math.round(d) === 1 ? 'day' : 'days'} ago`);
  const sig = [];

  // How long it has been up, and how often reposted
  if (first > 60 || reposts >= 3) sig.push({ k: 'age', s: 'bad', w: 25, label: `Up for ${Math.round(first)} days, reposted ${reposts} times`, detail: 'Real roles are usually filled within 30 to 45 days. Long-running, often-reposted ads are the most common sign of a ghost job.' });
  else if (first > 30 || reposts >= 1) sig.push({ k: 'age', s: 'warn', w: 10, label: `First posted ${days(first)}${reposts ? `, reposted ${reposts} ${reposts === 1 ? 'time' : 'times'}` : ''}`, detail: 'Older than most real listings, or bumped back to the top. Worth asking if the role is still open.' });
  else sig.push({ k: 'age', s: 'ok', w: 0, label: `First posted ${days(first)}`, detail: 'Fresh, and not reposted.' });

  // Same job across sites
  if (posts.some((x) => x.text === 'salary')) sig.push({ k: 'cross', s: 'warn', w: 8, label: `On ${posts.length} sites, with a different salary on one`, detail: 'The pay range on one site doesn\'t match the others. Often an old copy that was never taken down.' });
  else sig.push({ k: 'cross', s: 'ok', w: 0, label: posts.length > 1 ? `The same ad on ${posts.length} sites` : 'Only on one site', detail: posts.length > 1 ? 'Identical wording everywhere, as you\'d expect for a live role.' : 'Normal for government and smaller employers.' });

  // The employer's own careers page
  if (!co.careersPage) sig.push({ k: 'careers', s: 'bad', w: 20, label: 'Not on the company\'s own careers page', detail: 'Job boards show it, but the employer doesn\'t. Often already filled, or never real.' });
  else if (content.evergreen) sig.push({ k: 'careers', s: 'warn', w: 15, label: 'Marked "evergreen" on their careers page', detail: content.note });
  else sig.push({ k: 'careers', s: 'ok', w: 0, label: 'Also on their own careers page', detail: 'The employer lists it directly, so it\'s current.' });

  // Hiring record and company news
  if (co.registeredDaysAgo) sig.push({ k: 'hiring', s: 'bad', w: 25, label: `Business registered ${co.registeredDaysAgo} days ago`, detail: `A ${co.headcount[11]}-person company advertising ${co.openings[11]} senior roles, with no hiring history.` });
  else {
    const rate = co.track.filled / co.track.posted;
    sig.push(rate < 0.4
      ? { k: 'hiring', s: 'bad', w: 20, label: `Filled ${co.track.filled} of ${co.track.posted} roles they posted last year`, detail: 'Most of their ads never led to a hire.' }
      : rate < 0.65
        ? { k: 'hiring', s: 'warn', w: 10, label: `Filled ${co.track.filled} of ${co.track.posted} roles they posted last year`, detail: `Slow to hire${co.track.medianDays ? `: a median of ${co.track.medianDays} days per role` : ''}.` }
        : { k: 'hiring', s: 'ok', w: 0, label: `Filled ${co.track.filled} of ${co.track.posted} roles they posted last year`, detail: `A median of ${co.track.medianDays} days from ad to hire.` });
  }
  if (co.layoffs) sig.push({ k: 'news', s: 'bad', w: 20, label: `Cut ${co.layoffs.pct}% of staff ${co.layoffs.monthsAgo} months ago`, detail: `${co.layoffs.people} roles went, yet open ads have kept growing. New ads during cuts are often for show.` });

  // What the ad itself says
  if (content.scam) sig.push({ k: 'scam', s: 'bad', w: 40, label: `${content.scam.length} scam warning signs`, detail: content.scam.join('. ') + '.' });
  if (content.specific === false) sig.push({ k: 'text', s: 'warn', w: 12, label: 'Vague ad', detail: content.note });
  else if (!content.scam) sig.push({ k: 'text', s: 'ok', w: 0, label: 'Names the team, the stack and what you\'d do', detail: 'Specific ads are far more likely to be real.' });

  const jitter = (job.id.length * 7) % 5;
  const trust = Math.max(3, Math.min(97, 100 - sig.reduce((a, x) => a + x.w, 0) - jitter));
  const verdict = trust >= 70 ? 'real' : trust >= 40 ? 'doubt' : 'fake';
  return { trust, verdict, signals: sig, posts, company: co, first };
}

function checkBadge(job) {
  const c = listingCheck(job);
  if (c.verdict === 'real') return '';
  const v = VERDICT[c.verdict];
  const top = c.signals.filter((x) => x.s === 'bad').concat(c.signals.filter((x) => x.s === 'warn'))[0];
  return `<span class="lc-badge lc-${v.cls}" data-tip="${esc(v.label)}: ${esc(top ? top.label : '')}">${icon('alert', 11)} ${v.label}</span>`;
}

// 0–100 trust meter: three zones, one marker. Readable at a glance, no axis needed.
function trustMeter(trust, { big = false } = {}) {
  const v = trust >= 70 ? 'ok' : trust >= 40 ? 'warn' : 'bad';
  return `<div class="tm ${big ? 'tm-big' : ''}" role="img" aria-label="Trust ${trust} out of 100">
    <div class="tm-track"><span class="tm-z tm-z-bad"></span><span class="tm-z tm-z-warn"></span><span class="tm-z tm-z-ok"></span><span class="tm-mark tm-${v}" style="--x:${trust}%"></span></div>
    ${big ? '<div class="tm-scale"><span>Likely fake</span><span>Doubts</span><span>Looks real</span></div>' : ''}
  </div>`;
}

// Posting history: one lane per site, first post as a ring, reposts as dots, live span as a line
function postingTimeline(c) {
  const W = 520, rowH = 26, top = 8, left = 84, right = 12;
  const span = Math.max(30, Math.ceil(c.first * 1.15 / 10) * 10);
  const X = (d) => left + (1 - d / span) * (W - left - right);
  const H = top + c.posts.length * rowH + 22;
  let b = '';
  [span, Math.round(span / 2), 0].forEach((d) => {
    const x = X(d);
    b += `<line x1="${x}" y1="${top - 2}" x2="${x}" y2="${H - 20}" class="sv-grid"/>`;
    b += `<text x="${x}" y="${H - 6}" class="sv-tick" text-anchor="${d === 0 ? 'end' : d === span ? 'start' : 'middle'}">${d === 0 ? 'Today' : d + ' days ago'}</text>`;
  });
  c.posts.forEach((row, i) => {
    const y = top + i * rowH + rowH / 2;
    const p = platformOf(row.p);
    b += `<text x="0" y="${y + 4}" class="sv-label">${svgEsc(p.name.replace('Company career pages', 'Careers page'))}</text>`;
    const firstD = Math.max(...row.posts);
    b += `<line x1="${X(firstD)}" y1="${y}" x2="${X(0)}" y2="${y}" class="sv-live ${row.posts.length > 2 ? 'sv-live-bad' : ''}"/>`;
    row.posts.slice().sort((a, z) => z - a).forEach((d, k) => {
      b += k === 0
        ? `<circle cx="${X(d)}" cy="${y}" r="5" class="sv-first"><title>First posted ${Math.round(d)} days ago</title></circle>`
        : `<circle cx="${X(d)}" cy="${y}" r="3.5" class="sv-repost"><title>Reposted ${Math.round(d)} days ago</title></circle>`;
    });
    if (row.text === 'salary') b += `<text x="${X(0) - 2}" y="${y - 7}" class="sv-note" text-anchor="end">different salary</text>`;
  });
  return svg(W, H, b, 'sv sv-posts', 'Where and when this ad was posted');
}

// Staff numbers (line) against open roles (bars), last 12 months
function hiringChart(c) {
  const co = c.company;
  const W = 520, H = 150, left = 8, right = 8, top = 16, bottom = 22;
  const n = 12, bw = (W - left - right) / n;
  const hc = co.headcount;
  const valid = hc.filter((x) => x != null);
  const hMin = Math.min(...valid) * 0.96, hMax = Math.max(...valid) * 1.02;
  const oMax = Math.max(...co.openings, 4);
  const yH = (v) => top + (1 - (v - hMin) / Math.max(1, hMax - hMin)) * (H - top - bottom - 10);
  const yO = (v) => H - bottom - (v / oMax) * (H - top - bottom) * 0.55;
  let b = '';
  co.openings.forEach((v, i) => {
    const x = left + i * bw + bw * 0.22;
    b += `<rect x="${x}" y="${yO(v)}" width="${bw * 0.56}" height="${H - bottom - yO(v)}" rx="2" class="sv-bar"><title>${v} open roles</title></rect>`;
  });
  const pts = hc.map((v, i) => (v == null ? null : [left + i * bw + bw / 2, yH(v)])).filter(Boolean);
  if (pts.length > 1) b += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" class="sv-line"/>`;
  pts.forEach((p, i) => { if (i === pts.length - 1 || pts.length === 1) b += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="sv-dot"/>`; });
  if (co.layoffs) {
    const x = left + (n - 1 - co.layoffs.monthsAgo) * bw + bw / 2;
    b += `<line x1="${x}" y1="${top - 6}" x2="${x}" y2="${H - bottom}" class="sv-event"/><text x="${x + 4}" y="${top}" class="sv-note sv-note-bad">Layoffs</text>`;
  }
  ['12 months ago', '6 months ago', 'This month'].forEach((t, i) => {
    const x = i === 0 ? left : i === 1 ? left + 6 * bw : W - right;
    b += `<text x="${x}" y="${H - 6}" class="sv-tick" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}">${t}</text>`;
  });
  return svg(W, H, b, 'sv sv-hiring', 'Staff numbers against open roles over the last 12 months');
}

function hiringTakeaway(c) {
  const co = c.company;
  const hc = co.headcount.filter((x) => x != null);
  if (co.registeredDaysAgo) return 'No history: the company appeared this month.';
  const dh = (hc[hc.length - 1] - hc[0]) / hc[0];
  const o0 = co.openings.slice(0, 3).reduce((a, b) => a + b, 0), o1 = co.openings.slice(-3).reduce((a, b) => a + b, 0);
  const dO = (o1 - o0) / Math.max(1, o0);
  if (dh < -0.03 && dO > 0.3) return `Staff down ${Math.round(-dh * 100)}% while open roles grew ${Math.round(dO * 100)}%. That gap is a warning sign.`;
  if (dh > 0.05) return `Growing: staff up ${Math.round(dh * 100)}% this year, with hiring in step.`;
  if (dO > 0.8) return `Staff flat, but open roles up ${Math.round(dO * 100)}%. Ads are piling up without hires.`;
  return 'Steady: staff and open roles both flat.';
}

const CHECK_STEPS = ['Looking for copies of this ad on other sites', 'Checking the company\'s own careers page', 'Reading 12 months of staff and hiring numbers', 'Checking news for layoffs or hiring freezes', 'Reading the ad for vague or scam wording'];

function listingCheckHtml(job, open) {
  const c = listingCheck(job);
  const v = VERDICT[c.verdict];
  const r = insightState();
  const bad = c.signals.filter((x) => x.s !== 'ok');
  return `
  <section class="lc lc-${v.cls} ${open ? 'open' : ''}" data-lc>
    <button class="lc-head" data-lc-toggle aria-expanded="${!!open}">
      <span class="lc-verdict">${icon(v.icon, 15)} <strong>${v.label}</strong></span>
      <span class="lc-meter" data-tip="Trust ${c.trust} of 100, from ${c.signals.length} checks on the ad, the company and its hiring record">${trustMeter(c.trust)}</span>
      <span class="lc-sum muted small">${bad.length ? `${bad.length} ${bad.length === 1 ? 'concern' : 'concerns'}` : `${c.signals.length} checks passed`}</span>
      <span class="lc-chev">${icon('chevDown', 15)}</span>
    </button>
    <div class="lc-body" data-lc-body>${open ? (r.checked[job.id] ? listingCheckBody(job, c) : '') : ''}</div>
  </section>`;
}

function listingCheckBody(job, c) {
  return `
    <div class="lc-grid">
      <div class="lc-score">
        <div class="lc-score-n"><strong>${c.trust}</strong><span class="muted small">trust, out of 100</span></div>
        ${trustMeter(c.trust, { big: true })}
      </div>
      <ul class="lc-signals">${c.signals.map((x, i) => `<li class="lc-s lc-s-${x.s}" style="--i:${i}" data-tip="${esc(x.detail)}" tabindex="0"><span class="lc-s-ic">${icon(x.s === 'ok' ? 'check' : 'alert', 12)}</span>${esc(x.label)}</li>`).join('')}</ul>
    </div>
    <div class="lc-charts">
      <figure class="lc-fig"><figcaption><strong>Where and when it was posted</strong><span class="muted small">Ring: first post. Dot: repost.</span></figcaption>${postingTimeline(c)}</figure>
      <figure class="lc-fig"><figcaption><strong>Staff against open roles</strong><span class="muted small">${esc(hiringTakeaway(c))}</span></figcaption>${hiringChart(c)}
        <div class="lc-key"><span><i class="k-line"></i>Staff</span><span><i class="k-bar"></i>Open roles</span></div></figure>
    </div>
    <p class="muted small lc-src">Checked against SEEK, LinkedIn alerts, Indeed, Jora, the company's careers page, the business register and news. ${c.verdict !== 'real' ? 'This is a warning, not a verdict: if you\'re keen, ask the recruiter whether the role is still open before tailoring.' : ''}</p>`;
}

function bindListingCheck(root, job) {
  const sec = $('[data-lc]', root);
  if (!sec) return;
  const r = insightState();
  const body = $('[data-lc-body]', sec);
  const btn = $('[data-lc-toggle]', sec);
  btn.onclick = () => {
    const open = !sec.classList.contains('open');
    sec.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    r.ui.lcOpen = open;
    Store.save();
    if (!open) { body.innerHTML = ''; return; }
    load();
  };
  if (sec.classList.contains('open') && !r.checked[job.id]) load();
  async function load() {
    if (r.checked[job.id]) { body.innerHTML = listingCheckBody(job, listingCheck(job)); body.classList.add('lc-reveal'); return; }
    // First look: show the evidence being gathered, then reveal it in one move
    body.innerHTML = `<ol class="lc-steps">${CHECK_STEPS.map((s) => `<li><span class="lc-step-ic"><span class="spinner spinner-xs"></span></span>${s}</li>`).join('')}</ol>`;
    const lis = $$('li', body);
    for (let i = 0; i < lis.length; i++) {
      await sleep(reducedMotion() ? 0 : 230 + Math.random() * 120);
      if (!lis[i].isConnected) return;
      lis[i].classList.add('done');
      $('.lc-step-ic', lis[i]).innerHTML = icon('check', 12);
    }
    await sleep(reducedMotion() ? 0 : 180);
    if (!body.isConnected) return;
    r.checked[job.id] = true;
    Store.save();
    body.innerHTML = listingCheckBody(job, listingCheck(job));
    body.classList.add('lc-reveal');
  }
}

/* ---------- Applications: one object per job ----------
   An application is what used to be called a project: the job, its resume and cover letter, and
   its stage. Stage lives on the project (p.status); when it came from a match, the job mirrors it. */
const STAGES = ['draft', 'applied', 'interview', 'offer', 'rejected', 'ghosted'];
STATUS_LABEL.draft = 'Draft';

function projectJob(p) { return p && p.jobId ? jobsState().jobs.find((j) => j.id === p.jobId) : null; }
function historyFor(p) { return JOBS_MOCK.history.find((a) => a.projectRef && a.projectRef === p.company); }
function appStage(p) {
  if (p.status) return p.status;
  const j = projectJob(p);
  if (j) return ['new', 'saved', 'tailored', 'dismissed'].includes(j.status) ? 'draft' : j.status;
  const h = historyFor(p);
  return h ? h.status : 'draft';
}
function appSentAt(p) {
  if (p.sent) return p.sent.at;
  const j = projectJob(p);
  if (j && j.appliedAt) return j.appliedAt;
  const h = historyFor(p);
  return h ? Date.now() - h.daysAgo * 864e5 : p.updatedAt;
}
// Pseudo-job for applications made from a pasted ad, so people and the listing check still work
function appJob(p) {
  return projectJob(p) || { id: p.id, company: p.company, title: p.role, platform: 'seek', foundAt: p.createdAt || p.updatedAt, location: p.location, salary: '' };
}

function sendProject(p, at = Date.now()) {
  const j = projectJob(p);
  const c = listingCheck(appJob(p));
  p.sent = {
    at, title: p.role, company: p.company, location: p.location, salary: j ? j.salary : 'Not listed',
    platform: j ? j.platform : null, ad: p.jdText,
    resume: clone(p.docs.resume),
    coverLetter: p.coverLetterOff ? null : clone(p.docs.coverLetter),
    brief: clone(p.brief),
    variant: p.variant ? clone(p.variant) : null,
    check: { trust: c.trust, verdict: c.verdict },
  };
}

function setAppStage(p, stage, { at, quiet = false } = {}) {
  const firstSend = stage !== 'draft' && !p.sent && !historyFor(p);
  if (firstSend) sendProject(p, at || Date.now());
  p.status = stage;
  const j = projectJob(p);
  if (j) {
    j.status = stage === 'draft' ? 'tailored' : stage;
    if (p.sent) { j.snapshot = p.sent; j.appliedAt = p.sent.at; }
  }
  if (!quiet) toast(firstSend ? `Marked applied. The ad and the exact ${p.coverLetterOff ? 'resume' : 'resume and cover letter'} you sent are saved in Overview.` : `Moved to ${STATUS_LABEL[stage].toLowerCase()}`);
}

// Kept for callers that start from a job
function markApplied(job, at = Date.now(), { quiet = false } = {}) {
  const p = job.projectId && Store.project(job.projectId);
  if (p) return setAppStage(p, 'applied', { at, quiet });
  job.status = 'applied';
  job.appliedAt = at;
}

function stageSelect(p, attr = 'data-stage') {
  const s = appStage(p);
  return `<label class="stage-sel stage-${s}" data-tip="Where this application is. Choosing Applied saves a copy of exactly what you sent."><span class="sr-only">Stage</span><span class="stage-dot"></span><select ${attr}>${STAGES.map((x) => `<option value="${x}" ${s === x ? 'selected' : ''}>${STATUS_LABEL[x]}</option>`).join('')}</select></label>`;
}

function peopleFor(job) {
  if (INSIGHT_MOCK.people[job.id]) return INSIGHT_MOCK.people[job.id];
  const first = ['Sam', 'Ana', 'Ravi', 'Kate', 'Leo', 'Nina', 'Josh', 'Ivy'];
  const last = ['Nguyen', 'Walsh', 'Kapoor', 'Fraser', 'Moretti', 'Singh', 'Clarke', 'Ho'];
  const h = [...job.company].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return [
    { id: 'pp-hm-' + job.id, name: `${first[h % 8]} ${last[(h >> 2) % 8]}`, role: `Engineering Manager, ${job.company}`, how: 'Likely hiring manager: leads the team named in the ad.', degree: 0, ask: 'note' },
    { id: 'pp-rec-' + job.id, name: `${first[(h + 3) % 8]} ${last[(h + 5) % 8]}`, role: 'Talent Acquisition', how: job.platform ? `Posted the ad on ${platformOf(job.platform).name}.` : 'Recruiter for this team.', degree: 0, ask: 'note' },
  ];
}

function draftMessage(job, person) {
  const me = Store.state.kb.contact.name.split(' ')[0];
  const fn = person.name.split(' ')[0];
  const hl = (Store.state.kb.roles[0].highlights || [])[0];
  if (person.ask === 'referral') return `Hi ${fn},\n\nHope things are good at ${job.company}. I've just applied for the ${job.title} role. Given our time working together, would you be comfortable referring me, or pointing me to the right person on the team?\n\nHappy to send my resume or grab a quick coffee.\n\nThanks,\n${me}`;
  if (person.ask === 'intro') {
    const target = peopleFor(job).find((x) => x.degree !== 1) || {};
    return `Hi ${fn},\n\nI've applied for a ${job.title} role at ${job.company}. I noticed you worked with ${target.name || 'their team'} on the GOV.AU pattern library. Would you be open to a short intro? Even one line would help me get noticed.\n\nThanks so much,\n${me}`;
  }
  return `Hi ${fn},\n\nI've applied for the ${job.title} role at ${job.company}. One thing I'd bring: ${hl ? hl.text.charAt(0).toLowerCase() + hl.text.slice(1) : 'a record of shipping fast, accessible frontends'}.\n\nIf it's useful, I'd love 15 minutes to hear what the team is focused on this year.\n\nKind regards,\n${me}`;
}

// You -> your connections -> people at the company. Solid: a link exists. Dashed: cold.
function warmPathSvg(job, people) {
  const W = 420, rowH = 46;
  const mid = people.filter((p) => p.degree === 1);
  const far = people.filter((p) => p.degree !== 1);
  const H = Math.max(mid.length, far.length, 1) * rowH + 30;
  const Y = (i, n) => 22 + (H - 30) * ((i + 0.5) / n);
  const youY = (H - 8) / 2 + 4;
  const pos = {};
  mid.forEach((p, i) => (pos[p.name] = [210, Y(i, mid.length)]));
  far.forEach((p, i) => (pos[p.name] = [360, Y(i, far.length)]));
  let b = `<text x="40" y="12" class="sv-col" text-anchor="middle">You</text><text x="210" y="12" class="sv-col" text-anchor="middle">${mid.length ? 'Your connections' : ''}</text><text x="360" y="12" class="sv-col" text-anchor="middle">At ${svgEsc(job.company.length > 16 ? 'the company' : job.company)}</text>`;
  mid.forEach((p) => { const [x, y] = pos[p.name]; b += `<path d="M52 ${youY} C 130 ${youY}, 130 ${y}, ${x - 14} ${y}" class="sv-path sv-path-warm"/>`; });
  far.forEach((p) => {
    const [x, y] = pos[p.name];
    if (p.via && pos[p.via]) { const [vx, vy] = pos[p.via]; b += `<path d="M${vx + 14} ${vy} C ${vx + 70} ${vy}, ${x - 70} ${y}, ${x - 14} ${y}" class="sv-path sv-path-warm"/>`; }
    else b += `<path d="M52 ${youY} C 200 ${youY}, 220 ${y}, ${x - 14} ${y}" class="sv-path sv-path-cold"/>`;
  });
  b += `<circle cx="40" cy="${youY}" r="13" class="sv-you"/><text x="40" y="${youY + 4}" class="sv-init sv-init-you" text-anchor="middle">${svgEsc(initials(Store.state.kb.contact.name))}</text>`;
  people.forEach((p) => {
    const [x, y] = pos[p.name];
    b += `<circle cx="${x}" cy="${y}" r="13" class="sv-person ${p.bridge ? '' : 'sv-at'}"><title>${svgEsc(p.name)}: ${svgEsc(p.role)}</title></circle><text x="${x}" y="${y + 4}" class="sv-init" text-anchor="middle">${svgEsc(initials(p.name))}</text>`;
    b += `<text x="${x}" y="${y + 27}" class="sv-name" text-anchor="middle">${svgEsc(p.name.split(' ')[0])}</text>`;
  });
  return svg(W, H, b, 'sv sv-warm', 'How you are connected to people at ' + job.company);
}
const initials = (n) => n.split(' ').map((x) => x[0]).slice(0, 2).join('');

function stageTrack(p) {
  const j = projectJob(p);
  const stage = appStage(p);
  const sentAt = appSentAt(p);
  const out = (insightState().outreach || {})[appJob(p).id] || {};
  const contacted = Object.values(out).some((v) => v !== 'none');
  const reply = ['interview', 'offer', 'rejected'].includes(stage);
  const d = (ms) => new Date(ms).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  const followDue = sentAt ? sentAt + 7 * 864e5 : null;
  const steps = [
    { label: j ? 'Found' : 'Started', when: d(j ? j.foundAt : (p.createdAt || p.updatedAt)), state: 'done' },
    { label: 'Tailored', when: d(p.createdAt || p.updatedAt), state: 'done' },
    { label: 'Applied', when: sentAt ? d(sentAt) : 'Not yet', state: sentAt ? 'done' : 'next' },
    { label: contacted ? 'Followed up' : 'Follow up', when: !sentAt ? '' : contacted ? 'Done' : reply ? 'Not needed' : Date.now() > followDue ? 'Overdue since ' + d(followDue) : 'Due ' + d(followDue), state: !sentAt ? 'todo' : contacted || reply ? 'done' : Date.now() > followDue ? 'due' : 'next' },
    { label: reply ? STATUS_LABEL[stage] : stage === 'ghosted' ? 'No reply' : 'Reply', when: reply || stage === 'ghosted' ? '' : sentAt ? (Date.now() - sentAt > 21 * 864e5 ? 'Probably no reply' : 'Waiting') : '', state: stage === 'rejected' || stage === 'ghosted' ? 'closed' : reply ? 'done' : 'todo' },
  ];
  return `<ol class="st-track">${steps.map((s) => `<li class="st-${s.state}"><span class="st-dot">${s.state === 'done' ? icon('check', 11) : ''}</span><strong>${s.label}</strong><span class="muted small">${esc(s.when)}</span></li>`).join('')}</ol>`;
}

function docThumb(kind, doc, brief) {
  const html = kind === 'resume' ? Docs.renderResume(doc, Store.state.kb) : Docs.renderCoverLetter(doc, Store.state.kb, brief);
  return `<div class="thumb" aria-hidden="true"><div class="thumb-scale"><div class="sheet paper-a4">${html}</div></div></div>`;
}

/* Overview tab of an application (inside Studio): stage, what was sent, the ad, people, listing check */
function overviewHtml(p) {
  const r = insightState();
  const job = appJob(p);
  const s = p.sent;
  const stage = appStage(p);
  const people = peopleFor(job);
  const out = r.outreach[job.id] || {};
  const exp = s && s.variant && r.experiments.find((e) => e.id === s.variant.exp);
  const variant = exp && exp.variants.find((v) => v.key === s.variant.key);
  const OUT_LABEL = { none: 'Not contacted', sent: 'Messaged', replied: 'Replied' };
  const legacy = !s && stage !== 'draft';
  return `
  <div class="ov">
    ${stageTrack(p)}
    <div class="ap-grid">
      <div class="ap-col">
        <section class="ap-sec">
          <h2>${s ? 'What you sent' : 'Your documents'} ${infoTip(s ? 'Saved when you marked it applied. Later edits don\'t change this copy, so you always know what they read.' : 'When you mark this Applied, an exact copy of both documents is saved here.', s ? 'Saved automatically' : 'Not sent yet')}</h2>
          ${s ? `
          <div class="ap-docs">
            <button class="ap-doc" data-view-sent="resume" data-tip="Open the resume exactly as sent">${docThumb('resume', s.resume)}<span><strong>Resume</strong><span class="muted small">As sent</span></span></button>
            ${s.coverLetter ? `<button class="ap-doc" data-view-sent="coverLetter" data-tip="Open the cover letter exactly as sent">${docThumb('coverLetter', s.coverLetter, s.brief)}<span><strong>Cover letter</strong><span class="muted small">As sent</span></span></button>` : ''}
          </div>
          <dl class="ap-facts">
            <dt>Sent</dt><dd>${new Date(s.at).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</dd>
            <dt>Salary listed</dt><dd>${esc(s.salary || 'Not listed')}</dd>
            <dt>Listing check</dt><dd><span class="lc-inline lc-${VERDICT[s.check.verdict].cls}">${VERDICT[s.check.verdict].label}</span> <span class="muted small">trust ${s.check.trust}</span></dd>
            ${variant ? `<dt>Experiment</dt><dd><a href="#/map/experiments" class="exp-chip exp-${variant.key}" data-tip="This resume was version ${variant.key} of your '${esc(exp.name)}' experiment. Its outcome counts toward the result.">${variant.key}: ${esc(variant.label)}</a></dd>` : ''}
          </dl>` : `
          <div class="ap-docs">
            <button class="ap-doc" data-goto-kind="resume" data-tip="Edit the resume">${docThumb('resume', p.docs.resume)}<span><strong>Resume</strong><span class="muted small">${legacy ? 'Current version' : 'Draft'}</span></span></button>
            ${p.coverLetterOff ? '' : `<button class="ap-doc" data-goto-kind="coverLetter" data-tip="Edit the cover letter">${docThumb('coverLetter', p.docs.coverLetter, p.brief)}<span><strong>Cover letter</strong><span class="muted small">${legacy ? 'Current version' : 'Draft'}</span></span></button>`}
          </div>
          <p class="muted small ap-note">${legacy ? 'Sent before application records existed, so there\'s no saved copy of exactly what went out.' : 'Ready to send? Set the stage to Applied and the exact copy is saved here.'}</p>
          ${legacy ? '' : `<button class="btn btn-primary btn-sm" data-mark-sent>${icon('send', 14)} Mark as applied</button>`}`}
        </section>
        <details class="jx-disclosure ap-ad">
          <summary><span><strong>The job ad</strong><span class="muted small">${s ? `Saved ${new Date(s.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}. Ads often vanish before the interview; this copy won't.` : 'As you pasted or found it.'}</span></span></summary>
          <div class="jx-disclosure-body"><pre class="jd-ad">${esc(s ? s.ad : p.jdText)}</pre></div>
        </details>
        <div class="ov-lc">${listingCheckHtml(job, false)}</div>
      </div>
      <div class="ap-col">
        <section class="ap-sec">
          <h2>People to contact ${infoTip('From names in the ad, the company\'s public team page, and your own LinkedIn connections export. Messages are drafted for you to send yourself; nothing is sent for you.', 'Where these come from')}</h2>
          <p class="small ap-why">${people.some((x) => x.degree === 1) ? 'You have a warm path in. Referred candidates are far more likely to get an interview than cold applicants, so start there.' : 'No warm path yet. A short, specific note to the hiring manager is the next best thing.'}</p>
          <div class="ap-warm">${warmPathSvg(job, people)}</div>
          <ul class="ap-people">${people.map((x) => {
            const st = out[x.id] || 'none';
            const verb = x.ask === 'referral' ? 'Ask for a referral' : x.ask === 'intro' ? 'Ask for an intro' : 'Draft a note';
            return `<li class="ap-person">
              <span class="ap-av ${x.degree === 1 ? 'warm' : ''}">${esc(initials(x.name))}</span>
              <div class="ap-p-main"><div class="ap-p-top"><strong>${esc(x.name)}</strong>${x.degree === 1 ? '<span class="pill pill-ok" data-tip="In your LinkedIn connections">1st</span>' : x.degree === 2 ? `<span class="pill" data-tip="Connected through ${esc(x.via)}">2nd</span>` : ''}</div>
                <div class="small">${esc(x.role)}</div><div class="muted small">${esc(x.how)}</div></div>
              <div class="ap-p-act"><span class="ap-out ap-out-${st}">${OUT_LABEL[st]}</span><button class="btn btn-sm ${x.ask === 'referral' && st === 'none' ? 'btn-primary' : 'btn-ghost'}" data-draft="${x.id}">${st === 'none' ? verb : 'View message'}</button></div>
            </li>`;
          }).join('')}</ul>
        </section>
      </div>
    </div>
  </div>`;
}

function bindOverview(host, p, { rerender, gotoKind, viewSent }) {
  const r = insightState();
  const job = appJob(p);
  const people = peopleFor(job);
  r.outreach[job.id] = r.outreach[job.id] || {};
  const out = r.outreach[job.id];
  bindListingCheck(host, job);
  $$('[data-view-sent]', host).forEach((b) => (b.onclick = () => viewSent(b.dataset.viewSent)));
  $$('[data-goto-kind]', host).forEach((b) => (b.onclick = () => gotoKind(b.dataset.gotoKind)));
  const ms = $('[data-mark-sent]', host);
  if (ms) ms.onclick = () => { setAppStage(p, 'applied'); Store.saveNow(); rerender(); };
  $$('[data-draft]', host).forEach((b) => (b.onclick = () => {
    const x = people.find((y) => y.id === b.dataset.draft);
    openModal({
      title: `Message to ${x.name}`,
      body: `<p class="muted small">Drafted from this application. Edit it, copy it, and send it from your own LinkedIn or email.</p><textarea class="ap-msg" rows="10" data-msg>${esc(draftMessage(job, x))}</textarea>`,
      actions: [
        { label: 'Copy', kind: 'btn-ghost', fn: (m) => { const t = $('[data-msg]', m).value; try { navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { toast('Select the text and copy it'); } return false; } },
        { label: out[x.id] === 'sent' ? 'Mark as replied' : 'I\'ve sent it', kind: 'btn-primary', fn: () => { out[x.id] = out[x.id] === 'sent' ? 'replied' : 'sent'; Store.save(); rerender(); toast(out[x.id] === 'sent' ? `Noted. You'll get a reminder if ${x.name.split(' ')[0]} hasn't replied in 5 days.` : 'Marked as replied'); } },
      ],
    });
  }));
}

/* ---------- Resume experiments ---------- */
function expCounts(exp) {
  const r = jobsState();
  return exp.variants.map((v) => {
    const live = r.jobs.filter((j) => j.snapshot && j.snapshot.variant && j.snapshot.variant.exp === exp.id && j.snapshot.variant.key === v.key);
    const won = live.filter((j) => ['interview', 'offer'].includes(j.status)).length;
    return { ...v, sent: v.sent + live.length, interviews: v.interviews + won, live: live.length };
  });
}
// Wilson interval (90%) for an interview rate
function wilson(x, n, z = 1.645) {
  if (!n) return [0, 0, 0];
  const p = x / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [p, Math.max(0, c - h), Math.min(1, c + h)];
}
// Chance B's true rate beats A's (normal approximation to two Beta posteriors)
function probBBeatsA(a, b) {
  const m = (v) => (v.interviews + 1) / (v.sent + 2);
  const s2 = (v) => { const al = v.interviews + 1, be = v.sent - v.interviews + 1; return (al * be) / ((al + be) ** 2 * (al + be + 1)); };
  const zz = (m(b) - m(a)) / Math.sqrt(s2(a) + s2(b));
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  return 0.5 * (1 + erf(zz / Math.SQRT2));
}
function expVerdict(exp) {
  const [a, b] = expCounts(exp);
  const pB = probBBeatsA(a, b);
  const lead = pB >= 0.5 ? b : a, other = pB >= 0.5 ? a : b, pLead = Math.max(pB, 1 - pB);
  const need = Math.max(0, exp.target - a.sent) + Math.max(0, exp.target - b.sent);
  if (exp.status === 'done') return { a, b, pB, lead, pLead, need: 0, text: exp.winner ? `${exp.variants.find((v) => v.key === exp.winner).label} won` : 'No real difference', tone: exp.winner ? 'ok' : '' };
  if (need > 0) return { a, b, pB, lead, pLead, need, tone: pLead >= 0.75 ? 'lean' : '', text: pLead >= 0.75 ? `${lead.label} is ahead, but it's too early to call` : 'Too close to call yet' };
  if (pLead >= 0.9) return { a, b, pB, lead, pLead, need: 0, tone: 'ok', text: `${lead.label} wins` };
  return { a, b, pB, lead, pLead, need: 0, tone: '', text: 'No clear difference' };
}

// Interview rate per version: dot = measured rate, band = plausible range (90%). Overlap means "not sure yet".
function intervalPlot(vs) {
  const W = 680, rowH = 44, left = 110, right = 40, top = 8;
  const max = Math.min(1, Math.max(0.5, ...vs.map((v) => wilson(v.interviews, v.sent)[2])) + 0.05);
  const X = (p) => left + (p / max) * (W - left - right);
  const H = top + vs.length * rowH + 24;
  let b = '';
  for (let t = 0; t <= max + 1e-9; t += 0.1) {
    const x = X(t);
    b += `<line x1="${x}" y1="${top}" x2="${x}" y2="${H - 20}" class="sv-grid"/><text x="${x}" y="${H - 6}" class="sv-tick" text-anchor="middle">${Math.round(t * 100)}%</text>`;
  }
  vs.forEach((v, i) => {
    const y = top + i * rowH + rowH / 2;
    const [p, lo, hi] = wilson(v.interviews, v.sent);
    b += `<text x="0" y="${y - 3}" class="sv-label sv-strong">${svgEsc(v.key)}: ${svgEsc(v.label)}</text><text x="0" y="${y + 12}" class="sv-tick">${v.interviews} of ${v.sent} sent</text>`;
    b += `<rect x="${X(lo)}" y="${y - 7}" width="${Math.max(2, X(hi) - X(lo))}" height="14" rx="7" class="sv-ci sv-ci-${v.key}"><title>Plausible range ${Math.round(lo * 100)}% to ${Math.round(hi * 100)}%</title></rect>`;
    b += `<circle cx="${X(p)}" cy="${y}" r="6" class="sv-pt sv-pt-${v.key}"><title>${Math.round(p * 100)}% interview rate</title></circle>`;
    b += `<text x="${X(hi) + 8}" y="${y + 4}" class="sv-val">${Math.round(p * 100)}%</text>`;
  });
  return svg(W, H, b, 'sv sv-ci-plot', 'Interview rate for each version, with plausible range');
}

function experimentsTabHtml() {
  const r = insightState();
  const run = r.experiments.find((e) => e.status === 'running');
  const done = r.experiments.filter((e) => e.status === 'done');
  let head;
  if (run) {
    const v = expVerdict(run);
    head = `<div class="cm-headline"><h2>${esc(v.text)}</h2><p class="muted">${v.need ? `${esc(v.lead.label)} summaries have a ${Math.round(wilson(v.lead.interviews, v.lead.sent)[0] * 100)}% interview rate so far. ${v.need} more ${v.need === 1 ? 'application' : 'applications'} before the result is reliable.` : `After ${v.a.sent + v.b.sent} applications, ${Math.round(v.pLead * 100)}% likely ${esc(v.lead.label.toLowerCase())} is genuinely better.`} New resumes alternate between the two versions automatically.</p></div>`;
  } else head = `<div class="cm-headline"><h2>No experiment running</h2><p class="muted">Test one change to your resume at a time and see which version gets more interviews.</p><div class="cm-head-act"><button class="btn btn-sm btn-primary" data-new-exp>${icon('flask', 14)} Start an experiment</button></div></div>`;

  const runHtml = run ? (() => {
    const v = expVerdict(run);
    return `
    <section class="panel exp-run">
      <div class="exp-run-head">
        <div><h3>${esc(run.name)}</h3><p class="muted small">Running for ${run.startedDaysAgo} days. Outcome measured: interview or not.</p></div>
        <div class="row-gap"><button class="btn btn-sm btn-ghost" data-end-exp>End experiment</button><button class="icon-btn" data-exp-help aria-label="How experiments work" data-tip="How experiments work">${icon('info', 16)}</button></div>
      </div>
      <div class="exp-variants">${[v.a, v.b].map((x) => `<div class="exp-v exp-v-${x.key}"><span class="exp-chip exp-${x.key}">${x.key}: ${esc(x.label)}</span><p class="small">"${esc(x.sample)}"</p>
        <div class="exp-prog" data-tip="${x.sent} of ${run.target} applications sent with this version. Results firm up at ${run.target}."><span style="--w:${Math.min(1, x.sent / run.target)}"></span></div><span class="muted small">${x.sent} of ${run.target} sent</span></div>`).join('')}</div>
      <figure class="exp-fig"><figcaption><strong>Interview rate</strong><span class="muted small">Dot: rate so far. Band: where the true rate probably sits. Bands that overlap mean it's not settled.</span></figcaption>${intervalPlot([v.a, v.b])}</figure>
      <div class="exp-odds">
        <div class="exp-odds-label"><strong>${Math.round(v.pLead * 100)}%</strong><span class="small">likely ${esc(v.lead.label.toLowerCase())} is better</span></div>
        <div class="exp-odds-bar" data-tip="Called at 90% once both versions reach ${run.target} sends"><span class="exp-odds-fill" style="--w:${v.pLead}"></span><span class="exp-odds-line" style="--x:0.9"></span></div>
      </div>
    </section>`;
  })() : '';

  const doneHtml = done.length ? `
    <section class="exp-done">
      <h3>Finished</h3>
      <ul>${done.map((e) => {
        const [a, b] = expCounts(e);
        const pa = a.interviews / a.sent, pb = b.interviews / b.sent, X = (p) => 4 + p * 92;
        return `<li class="exp-done-row">
          <div><strong>${esc(e.name)}</strong><span class="muted small">${esc(a.label)} against ${esc(b.label)}, ${a.sent + b.sent} applications</span></div>
          <svg viewBox="0 0 100 20" class="sv exp-db" aria-label="${esc(a.label)} ${Math.round(pa * 100)}%, ${esc(b.label)} ${Math.round(pb * 100)}%"><line x1="4" y1="10" x2="96" y2="10" class="sv-grid"/><line x1="${X(Math.min(pa, pb))}" y1="10" x2="${X(Math.max(pa, pb))}" y2="10" class="sv-db-line"/><circle cx="${X(pa)}" cy="10" r="4" class="sv-pt sv-pt-A"><title>${esc(a.label)}: ${Math.round(pa * 100)}%</title></circle><circle cx="${X(pb)}" cy="10" r="4" class="sv-pt sv-pt-B"><title>${esc(b.label)}: ${Math.round(pb * 100)}%</title></circle></svg>
          <span class="${e.winner ? 'pill pill-ok' : 'pill'}" data-tip="${e.winner ? 'Your resumes now use the winning version' : 'Neither version got more interviews. Keep whichever is easier.'}">${e.winner ? esc(e.variants.find((v) => v.key === e.winner).label) + ' won' : 'No difference'}</span>
        </li>`;
      }).join('')}</ul>
    </section>` : '';
  return head + runHtml + doneHtml;
}

function bindExperiments(root, rerender) {
  const r = insightState();
  const run = r.experiments.find((e) => e.status === 'running');
  const help = $('[data-exp-help]', root);
  if (help) help.onclick = () => openModal({ title: 'How resume experiments work', body: `<ol class="exp-how"><li>Pick one thing to change. Everything else stays the same, so any difference comes from that change.</li><li>Each new resume alternates between version A and version B automatically.</li><li>When you mark an application as interview or offer, it counts as a win for its version.</li><li>Once both versions reach the target, the result is called if one is at least 90% likely to be better. Before that, the chart shows which way it's leaning.</li></ol>`, actions: [{ label: 'Got it', kind: 'btn-primary' }] });
  const end = $('[data-end-exp]', root);
  if (end) end.onclick = () => {
    const v = expVerdict(run);
    openModal({ title: 'End this experiment?', body: `<p>${v.need ? `It still needs ${v.need} more applications to be reliable. ` : ''}${v.pLead >= 0.75 ? `${esc(v.lead.label)} is ahead, ${Math.round(v.pLead * 100)}% likely better.` : 'Neither version is clearly ahead.'}</p>`,
      actions: [{ label: 'Keep running' }, { label: v.pLead >= 0.75 ? `End and use ${v.lead.label}` : 'End experiment', kind: 'btn-primary', fn: () => { run.status = 'done'; run.endedDaysAgo = 0; run.winner = v.pLead >= 0.75 ? v.lead.key : null; Store.save(); rerender(); toast(run.winner ? `New resumes will use the ${v.lead.label.toLowerCase()} version` : 'Experiment ended'); } }] });
  };
  const nb = $('[data-new-exp]', root);
  if (nb) nb.onclick = () => newExperimentModal(rerender);
}

function newExperimentModal(rerender) {
  const r = insightState();
  let pick = INSIGHT_MOCK.experimentIdeas[0];
  openModal({
    title: 'Start an experiment', wide: true,
    body: `<p class="muted small">Choose one thing to test. New resumes will alternate between the two versions.</p>
      <div class="exp-ideas">${INSIGHT_MOCK.experimentIdeas.map((x, i) => `<button type="button" class="exp-idea ${i === 0 ? 'on' : ''}" data-idea="${i}" aria-pressed="${i === 0}"><strong>${esc(x.name)}</strong><span class="small"><span class="exp-chip exp-A">A</span> ${esc(x.a)}: ${esc(x.aSample)}</span><span class="small"><span class="exp-chip exp-B">B</span> ${esc(x.b)}: ${esc(x.bSample)}</span></button>`).join('')}</div>
      <p class="muted small">Needs about 20 applications per version for a reliable answer. At your pace, that's around ${Math.round(40 / 4)} weeks.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Start experiment', kind: 'btn-primary', fn: () => {
      r.experiments.unshift({ id: uid('exp'), name: pick.name, variable: pick.variable, status: 'running', startedDaysAgo: 0, target: 20, next: 'A',
        variants: [{ key: 'A', label: pick.a, sample: pick.aSample, sent: 0, replies: 0, interviews: 0 }, { key: 'B', label: pick.b, sample: pick.bSample, sent: 0, replies: 0, interviews: 0 }] });
      Store.save(); rerender(); toast(`Experiment started. The next resume uses version A: ${pick.a.toLowerCase()}.`);
    } }],
    onMount(m) {
      $$('[data-idea]', m).forEach((b) => (b.onclick = () => { pick = INSIGHT_MOCK.experimentIdeas[+b.dataset.idea]; $$('[data-idea]', m).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); }));
    },
  });
}

// Each new tailored resume takes the next version of the running experiment
function assignVariant(p) {
  if (!p || p.variant) return;
  const r = jobsState();
  const run = (r.experiments || []).find((e) => e.status === 'running');
  if (!run) return;
  p.variant = { exp: run.id, key: run.next };
  run.next = run.next === 'A' ? 'B' : 'A';
}

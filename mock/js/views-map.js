/* Career map: your whole job search on one page.
   Constellation: force-directed map of applications and matches, clustered by domain, linked by shared skills.
   Flow: a Sankey of everything from crawled listing to offer.
   Timing: when matching jobs are posted versus when your sweeps run. */

function careerData(opts = {}) {
  const st = Store.state;
  const r = jobsState();
  const kbText = JSON.stringify(st.kb);
  const jobNodes = [];
  const domainOfProject = (p) => {
    if (JOBS_MOCK.companyDomains[p.company]) return JOBS_MOCK.companyDomains[p.company];
    const k = (p.brief.keywords || []).join(' ') + ' ' + p.company;
    if (/fintech|pay|bank/i.test(k)) return 'Fintech';
    if (/health/i.test(k)) return 'Health';
    if (/government|gov/i.test(k)) return 'Government';
    return 'Other';
  };
  const usedProjects = new Set();
  JOBS_MOCK.history.forEach((a) => {
    const proj = a.projectRef && st.projects.find((p) => p.company === a.projectRef);
    if (proj) usedProjects.add(proj.id);
    jobNodes.push({ id: a.id, kind: 'job', label: a.company, title: a.title, domain: a.domain, status: proj ? appStage(proj) : a.status, score: 78, keywords: a.keywords, projectId: proj && proj.id, sub: `${STATUS_LABEL[a.status]} · applied ${a.daysAgo} days ago`, daysAgo: a.daysAgo });
  });
  r.jobs.filter((j) => j.status !== 'dismissed').forEach((j) => {
    if (j.projectId) usedProjects.add(j.projectId);
    jobNodes.push({ id: j.id, kind: 'job', label: j.company, title: j.title, domain: j.domain, status: j.status, score: j.score, keywords: j.keywords, missing: j.missing, projectId: j.projectId, jobId: j.id, daysAgo: j.appliedAt ? Math.floor((Date.now() - j.appliedAt) / 864e5) : undefined, sub: `${STATUS_LABEL[j.status]}, match score ${j.score}, found on ${platformOf(j.platform).name}` });
  });
  st.projects.filter((p) => !usedProjects.has(p.id) && !jobNodes.some((n) => n.label === p.company)).forEach((p) => {
    const stg = appStage(p);
    jobNodes.push({ id: 'p-' + p.id, kind: 'job', label: p.company, title: p.role, domain: domainOfProject(p), status: stg === 'draft' ? 'tailored' : stg, score: 74, keywords: (p.brief.keywords || []).slice(0, 6), projectId: p.id, sub: stg === 'draft' ? 'Draft, not sent yet' : STATUS_LABEL[stg] });
  });

  const count = {};
  jobNodes.forEach((n) => n.keywords.forEach((k) => (count[k] = (count[k] || 0) + 1)));
  const skillIds = new Map();
  const nodes = [...jobNodes];
  const links = [];
  const addSkill = (k, gap) => {
    if (!skillIds.has(k)) {
      const interviews = jobNodes.filter((n) => ['interview', 'offer'].includes(n.status) && n.keywords.includes(k)).length;
      const node = { id: 'sk-' + k, kind: 'skill', label: k, gap: gap || !Docs.kwMatch(kbText, k), interviews };
      skillIds.set(k, node);
      nodes.push(node);
    }
    return skillIds.get(k);
  };
  jobNodes.forEach((n) => {
    n.keywords.forEach((k) => { if (count[k] >= 2) links.push({ source: n.id, target: addSkill(k).id }); });
    if (opts.gaps) (n.missing || []).forEach((k) => links.push({ source: n.id, target: addSkill(k, true).id }));
  });
  return { nodes, links, jobNodes };
}

function careerInsights(jobNodes) {
  const applied = jobNodes.filter((n) => ['applied', 'interview', 'offer', 'rejected', 'ghosted'].includes(n.status));
  const byDomain = {};
  applied.forEach((n) => {
    const d = (byDomain[n.domain] = byDomain[n.domain] || { applied: 0, won: 0 });
    d.applied++;
    if (['interview', 'offer'].includes(n.status)) d.won++;
  });
  const domains = Object.entries(byDomain).map(([k, v]) => ({ domain: k, ...v, rate: v.won / v.applied })).sort((a, b) => b.rate - a.rate || b.applied - a.applied);
  const won = applied.filter((n) => ['interview', 'offer'].includes(n.status));
  const skillWins = {};
  won.forEach((n) => n.keywords.forEach((k) => (skillWins[k] = (skillWins[k] || 0) + 1)));
  const topSkills = Object.entries(skillWins).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const gaps = {};
  jobNodes.filter((n) => n.missing).forEach((n) => n.missing.forEach((k) => (gaps[k] = (gaps[k] || 0) + 1)));
  const topGaps = Object.entries(gaps).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return { applied, won, domains, topSkills, topGaps };
}

Views.map = function (root, params) {
  const r = jobsState();
  insightState();
  const tab = ['flow', 'timing', 'experiments'].includes(params[0]) ? params[0] : 'skills';
  const ui = (r.mapUi = r.mapUi || {});
  if (ui.v !== 2) { ui.v = 2; ui.showMatches = false; } // simpler default: applications only
  const charts = [];
  const { nodes, links, jobNodes } = careerData();
  const ins = careerInsights(jobNodes);
  const hues = { ...JOBS_MOCK.domains, Other: 200 };
  const list = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : xs[0] || '');

  const tabs = `<nav class="jb-tabs" aria-label="Career map views">
    <a href="#/map" class="${tab === 'skills' ? 'on' : ''}" data-tip="Where your applications cluster, and which skills they share">Skills map</a>
    <a href="#/map/flow" class="${tab === 'flow' ? 'on' : ''}" data-tip="How many jobs make it from search to offer, and where they drop out">Funnel</a>
    <a href="#/map/timing" class="${tab === 'timing' ? 'on' : ''}" data-tip="When matching jobs are posted, and whether your sweeps catch them early">Timing</a>
    <a href="#/map/experiments" class="${tab === 'experiments' ? 'on' : ''}" data-tip="Test one change to your resume and see which version gets more interviews">Experiments</a>
  </nav>`;
  const headline = (title, body, action = '') => `<div class="cm-headline"><h2>${title}</h2><p class="muted">${body}</p>${action}</div>`;

  /* --- Skills map --- */
  function skillsHeadline() {
    const winners = ins.domains.filter((d) => d.won).map((d) => d.domain);
    const top = ins.topSkills.slice(0, 2).map(([k]) => k);
    return headline(
      winners.length ? `You get interviews in ${list(winners.slice(0, 2))}` : 'No interviews yet',
      `${top.length ? `${list(top)} ${top.length > 1 ? 'show' : 'shows'} up in most of them, so lead with ${top.length > 1 ? 'those' : 'it'}. ` : ''}Each dot is a job you applied for, grouped by industry. Lines join jobs that asked for the same skill.`);
  }

  function sidePanel() {
    const maxA = Math.max(...ins.domains.map((d) => d.applied), 1);
    const best = ins.domains[0];
    const worst = [...ins.domains].reverse().find((d) => d.applied >= 2 && d.won === 0);
    return `
      <div class="cm-side-sec">
        <h3>Interviews by industry</h3>
        <p class="cm-take">${best && best.won ? `${esc(best.domain)} is working: ${best.won} of ${best.applied} got an interview.` : 'Not enough replies yet to compare.'}${worst ? ` ${esc(worst.domain)} hasn't yet (0 of ${worst.applied}).` : ''}</p>
        <div class="cm-dom">${ins.domains.map((d) => `<div class="cm-dom-row" data-tip="${d.won} of ${d.applied} ${esc(d.domain)} applications reached interview" tabindex="0"><span class="cm-dom-name">${esc(d.domain)}</span><div class="cm-dom-bar"><span style="width:${(d.applied / maxA) * 100}%"></span><span class="won" style="width:${(d.won / maxA) * 100}%"></span></div><span class="small">${d.won}/${d.applied}</span></div>`).join('')}</div>
      </div>
      ${ins.topGaps.length ? `<div class="cm-side-sec">
        <h3>Skills your matches ask for</h3>
        <p class="cm-take">${esc(ins.topGaps[0][0])} comes up${ins.topGaps[0][1] > 1 ? ` in ${ins.topGaps[0][1]} matches` : ''}, and your knowledge base has nothing on it.</p>
        <div class="chips">${ins.topGaps.map(([k, n]) => `<span class="chip chip-missing" data-tip="Asked for by ${n} ${n === 1 ? 'match' : 'matches'}, with no evidence in your knowledge base">${esc(k)}</span>`).join('')}</div>
        <a class="link-btn cm-act" href="#/kb">Add evidence to your knowledge base</a>
      </div>` : ''}`;
  }

  function selectedHtml(n) {
    const job = n.jobId && r.jobs.find((j) => j.id === n.jobId);
    const proj = n.projectId && Store.project(n.projectId);
    const sim = jobNodes.filter((m) => m !== n).map((m) => ({ n: m, shared: m.keywords.filter((k) => n.keywords.includes(k)) })).filter((x) => x.shared.length >= 2).sort((a, b) => b.shared.length - a.shared.length).slice(0, 3);
    return `
      <div class="cm-side-sec cm-sel">
        <button class="link-btn cm-back" data-unselect>${icon('chevLeft', 13)} Back to insights</button>
        <h3>${esc(n.title)}</h3>
        <p class="muted">${esc(n.label)}, ${esc(n.domain)}</p>
        <p><span class="pill ${['interview', 'offer'].includes(n.status) ? 'pill-ok' : n.status === 'rejected' ? 'pill-bad' : ['new', 'saved'].includes(n.status) ? 'pill-warn' : ''}">${STATUS_LABEL[n.status]}</span></p>
        <div class="chips">${n.keywords.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</div>
        <div class="cm-sel-actions">
          ${proj ? `<a class="btn btn-primary btn-sm" href="#/project/${proj.id}/overview">Open application</a>` : ''}
          ${job && !proj ? `<button class="btn btn-primary btn-sm" data-tailor-auto>${icon('zap', 14)} Generate resume</button>` : ''}
          ${job ? `<button class="btn btn-ghost btn-sm" data-in-inbox>View in Jobs</button>` : ''}
        </div>
      </div>
      ${sim.length ? `<div class="cm-side-sec"><h3>Most alike</h3><ul class="cm-sim">${sim.map((m) => `<li><button class="link-btn" data-sel="${m.n.id}">${esc(m.n.label)}</button><span class="muted small">${STATUS_LABEL[m.n.status]}. Shares ${esc(list(m.shared.slice(0, 3)))}.</span></li>`).join('')}</ul></div>` : ''}`;
  }

  function legend() {
    return [['var(--ok)', 'Offer'], ['var(--accent)', 'Interview'], ['var(--ink-2)', 'Applied'], ['var(--accent-ink)', 'Tailored'], ['var(--danger)', 'Rejected'], ['var(--muted)', 'No reply']]
      .map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('') + (ui.showMatches ? '<span><i class="lg-match"></i>New match</span>' : '') + '<span><i class="lg-skill"></i>Shared skill</span><span data-tip="Asked for by these jobs, but your knowledge base has no evidence of it"><i class="lg-gap"></i>Not in your knowledge base</span>';
  }

  let body;
  if (tab === 'skills') {
    body = `${skillsHeadline()}
      <div class="cm-layout">
        <section class="panel cm-canvas-panel">
          <div class="cm-toolbar">
            <div class="cm-legend" data-legend>${legend()}</div>
            <label class="toggle" data-tip="Also show jobs your sweeps found that you haven't acted on"><input type="checkbox" data-matches ${ui.showMatches ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-text">New matches</span></label>
          </div>
          <div class="cm-canvas" data-constellation></div>
          <p class="muted small cm-hint">Hover a skill to see which jobs asked for it. Click a job for details. Drag to untangle.</p>
          <details class="cm-list"><summary>View as a table</summary>
            <table class="jb-rej-table"><thead><tr><th>Company</th><th>Role</th><th>Industry</th><th>Status</th></tr></thead><tbody>
            ${jobNodes.filter((n) => ui.showMatches || !['new', 'saved'].includes(n.status)).map((n) => `<tr><td><strong>${esc(n.label)}</strong></td><td>${esc(n.title)}</td><td>${esc(n.domain)}</td><td>${STATUS_LABEL[n.status]}</td></tr>`).join('')}
            </tbody></table></details>
        </section>
        <aside class="panel cm-side" data-side>${sidePanel()}</aside>
      </div>`;
  } else if (tab === 'flow') {
    const st = flowStages();
    const drops = [1, 2, 3].map((i) => ({ i, lost: st[i].value - st[i + 1].value, frac: 1 - st[i + 1].value / Math.max(1, st[i].value) }));
    const big = drops.sort((a, b) => b.lost - a.lost)[0];
    const msg = big.i === 1 ? [`${big.lost} good matches never got a resume`, 'That\'s the biggest drop in your search. Most of them are still in Jobs, already scored and ready to tailor in one click.', '<a class="btn btn-sm btn-primary" href="#/jobs">Review matches</a>']
      : big.i === 2 ? [`${big.lost} tailored resumes were never sent`, 'They\'re finished, so sending them is the quickest win.', '<a class="btn btn-sm btn-primary" href="#/dashboard">See what\'s ready</a>']
      : [`${Math.round((st[4].value / Math.max(1, st[3].value)) * 100)}% of your applications reach interview`, 'Compare the skills in your wins with the ones you lead with.', '<a class="btn btn-sm btn-ghost" href="#/map">Open the skills map</a>'];
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    body = `${headline(msg[0], msg[1], `<div class="cm-head-act">${msg[2]}</div>`)}
      <section class="panel"><div data-flow></div><p class="muted small cm-hint">Last 30 days. Hover a column or a drop-off for what's behind it.</p></section>
      <div class="cm-stats">
        <div class="panel"><strong>${pct(st[2].value, st[1].value)}%</strong><span>of kept jobs got a tailored resume</span></div>
        <div class="panel"><strong>${pct(st[4].value, st[3].value)}%</strong><span>of sent applications reached interview</span></div>
        <div class="panel"><strong>${st[5].value} of ${st[4].value}</strong><span>interviews became offers so far</span></div>
      </div>`;
  } else if (tab === 'experiments') {
    body = `<div data-exp>${experimentsTabHtml()}</div>`;
  } else {
    const active = r.sweeps.filter((x) => x.active);
    const all = active.flatMap((x) => x.schedule.crons);
    const fr = all.length ? scheduleFreshness(all) : null;
    const better = fr && suggestBetter(all, fr);
    body = `${headline('Most matching jobs are posted Tuesday to Thursday, 8 to 10am',
      fr ? `Your sweeps see a new job about ${fr.hours.toFixed(1)} hours after it goes up, and ${fr.within4}% within 4 hours. ${better ? `Running "${esc(better.text.toLowerCase())}" would cut that to ${better.hours.toFixed(1)} hours.` : 'That\'s early enough to be among the first applicants.'}` : 'Turn on a sweep to see how quickly you catch new jobs.',
      `<div class="cm-head-act"><a class="btn btn-sm btn-ghost" href="#/jobs/sweeps">Adjust schedules</a></div>`)}
      <section class="panel">
        <div data-heat></div>
        <div class="cm-legend cm-legend-foot"><span><i class="lg-heat"></i>Darker: more matching jobs posted (8 weeks)</span>${active.map((x) => `<span><i class="lg-ring" style="border-color:${sweepColor(x.id)}"></i>${esc(x.name)} runs</span>`).join('')}</div>
      </section>`;
  }

  root.innerHTML = shell(`
    <div class="jx-head"><h1>Career map</h1><p class="muted">What's working in your search, and what to change.</p></div>
    ${tabs}
    ${body}
  `, { route: 'map', title: '<span>Career map</span>' });
  bindShell(root);

  if (tab === 'skills') {
    const side = $('[data-side]', root);
    let chart;
    const showSel = (n) => {
      side.innerHTML = n ? selectedHtml(n) : sidePanel();
      const un = $('[data-unselect]', side);
      if (un) un.onclick = () => { chart.update({ select: null }); showSel(null); };
      $$('[data-sel]', side).forEach((b) => (b.onclick = () => { const m = jobNodes.find((x) => x.id === b.dataset.sel); chart.update({ select: m.id }); showSel(m); }));
      if (n && n.jobId) {
        const job = r.jobs.find((j) => j.id === n.jobId);
        const a = $('[data-tailor-auto]', side), v = $('[data-in-inbox]', side);
        if (a) a.onclick = () => tailorJob(job, 'auto');
        if (v) v.onclick = () => { r.ui.selected = job.id; r.ui.filter = 'all'; Store.save(); location.hash = '#/jobs'; };
      }
    };
    chart = Viz.constellation($('[data-constellation]', root), { nodes, links }, {
      colorBy: 'status', showMatches: ui.showMatches, domainHues: hues,
      onSelect: (n) => showSel(n && jobNodes.find((x) => x.id === n.id)), // viz holds copies; map back by id
    });
    charts.push(chart);
    $('[data-matches]', root).onchange = (e) => { ui.showMatches = e.target.checked; Store.save(); chart.update({ showMatches: ui.showMatches }); $('[data-legend]', root).innerHTML = legend(); };
  } else if (tab === 'flow') {
    charts.push(Viz.funnel($('[data-flow]', root), flowStages()));
  } else if (tab === 'experiments') {
    const host = $('[data-exp]', root);
    const rerender = () => { host.innerHTML = experimentsTabHtml(); bindExperiments(host, rerender); };
    bindExperiments(host, rerender);
  } else {
    charts.push(Viz.heatmap($('[data-heat]', root), JOBS_MOCK.postingHeat, { runs: heatRuns(r.sweeps.filter((x) => x.active)) }));
  }
  return () => charts.forEach((c) => c.destroy());

  function flowStages() {
    const crawled = r.runs.reduce((a, x) => a + x.crawled, 0) + r.runs.length * 8;
    const kept = r.jobs.length + JOBS_MOCK.history.length + 24;
    const tailored = Math.min(kept, jobNodes.filter((n) => !['new', 'saved'].includes(n.status)).length + 2);
    const applied = Math.min(tailored, ins.applied.length);
    const interview = ins.won.length;
    const offer = jobNodes.filter((n) => n.status === 'offer').length;
    return [
      { label: 'Listings found', short: 'Found', value: crawled, how: `${r.runs.length} sweep runs` },
      { label: 'Kept by your sweeps', short: 'Kept', value: kept, dropLabel: 'filtered out', how: 'Passed your rules and the AI judge', reasons: ['Duplicates, rule misses and off-target roles'] },
      { label: 'Tailored', short: 'Tailored', value: tailored, dropLabel: 'not tailored', how: 'A resume was made for it', reasons: ['Hidden as not for you', 'Still waiting in Jobs'] },
      { label: 'Applied', short: 'Applied', value: applied, dropLabel: 'not sent', how: 'You sent it', reasons: ['Resume ready but never sent'] },
      { label: 'Interview', short: 'Interview', value: interview, dropLabel: 'no interview', how: 'Reached at least a first interview', reasons: [`Rejected: ${jobNodes.filter((n) => n.status === 'rejected').length}`, `No reply: ${jobNodes.filter((n) => n.status === 'ghosted').length}`, `Waiting: ${jobNodes.filter((n) => n.status === 'applied').length}`] },
      { label: 'Offer', short: 'Offer', value: offer, dropLabel: 'in progress', how: 'Offers received', reasons: ['Interviews still in progress'] },
    ];
  }
};

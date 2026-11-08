/* Jobs: sweeps (scheduled crawls of job sites), the matches inbox, the new-sweep wizard,
   the natural-language scheduler and the live sweep run. Jobs hand off to the existing pipeline:
   Automatic runs Quick generate, Manual opens Studio. Canvas charts live in viz.js. */

/* ---------- State (lazy, so saved state from before this section still loads) ---------- */
function jobsState() {
  const st = Store.state;
  if (!st.radar) {
    const now = Date.now();
    st.radar = {
      profile: clone(JOBS_MOCK.profile),
      sweeps: clone(JOBS_MOCK.sweeps),
      jobs: clone(JOBS_MOCK.jobs).map((j) => ({ ...j, foundAt: now - j.hoursAgo * 3600e3 })),
      runs: JOBS_MOCK.runs.map(([d, sweep, kept, crawled, status], i) => ({
        id: 'run-' + (1283 - i), at: now - d * 864e5 - (i % 3) * 6 * 3600e3 - 3600e3, sweep, kept, crawled, status,
        secs: 12 + ((i * 7) % 11),
        note: status === 'fail' ? 'SEEK returned 403 after a layout change. The crawler selectors were updated automatically and the next run passed.' : status === 'warn' ? 'LinkedIn alert email arrived late; 2 listings carried over to the next run.' : '',
      })),
      ui: { filter: 'foryou', platform: 'all', sort: 'score', selected: 'job-quokka' },
      draft: null,
      runSeq: 1284,
      freshAdded: false,
    };
    Store.save();
  }
  return st.radar;
}

const SWEEP_COLORS = ['#0E7466', '#B4547A', '#B26A12', '#4F5BD5', '#5B7A1E'];
const sweepColor = (id) => { const r = jobsState(); const i = r.sweeps.findIndex((s) => s.id === id); return SWEEP_COLORS[(i < 0 ? 0 : i) % SWEEP_COLORS.length]; };
const platformOf = (id) => JOBS_MOCK.platforms.find((p) => p.id === id) || { name: id, short: '?', hue: 0 };
const platformBadge = (id) => { const p = platformOf(id); return `<span class="pf-badge" style="--h:${p.hue}" title="${esc(p.name)}">${esc(p.short)}</span>`; };
const money = (n) => '$' + Math.round(n / 1000) + 'k';
const JUDGE_MODEL = 'claude-haiku-5-5';
const STATUS_LABEL = { new: 'New', saved: 'Saved', tailored: 'Tailored', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected', ghosted: 'No reply', dismissed: 'Dismissed' };

function hoursLabel(ms) {
  const h = (Date.now() - ms) / 3600e3;
  if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm ago';
  if (h < 24) return Math.round(h) + 'h ago';
  return Math.round(h / 24) + 'd ago';
}
function untilLabel(ms) {
  const m = Math.round((ms - Date.now()) / 60e3);
  if (m < 60) return 'in ' + Math.max(1, m) + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  return 'in ' + Math.round(h / 24) + 'd';
}
function scoreRing(score, size = 'md', tip = true) {
  const tone = score >= 85 ? 'hi' : score >= 75 ? 'mid' : 'lo';
  const t = tip ? ` data-tip="Match score ${score} of 100. ${score >= 85 ? 'A strong fit.' : score >= 75 ? 'A good fit with a gap or two.' : 'Worth a look, with real gaps.'}"` : '';
  return `<span class="score-ring score-${size} score-${tone}" style="--p:${score}" role="img" aria-label="Match score ${score} out of 100"${t}><span>${score}</span></span>`;
}

/* ---------- Cron: parse, match, list upcoming runs, describe ---------- */
const Cron = (function () {
  function field(f, min, max) {
    const set = new Set();
    String(f).split(',').forEach((part) => {
      const [rng, st] = part.split('/');
      const step = +st || 1;
      let a, b;
      if (rng === '*') { a = min; b = max; } else if (rng.includes('-')) { [a, b] = rng.split('-').map(Number); } else { a = +rng; b = st ? max : a; }
      for (let v = a; v <= b; v += step) if (v >= min && v <= max) set.add(v === 7 && max === 6 ? 0 : v);
    });
    return set;
  }
  function valid(expr) {
    const f = String(expr).trim().split(/\s+/);
    if (f.length !== 5) return false;
    return f.every((x) => /^(\*|\d+(-\d+)?)(\/\d+)?(,(\*|\d+(-\d+)?)(\/\d+)?)*$/.test(x));
  }
  function parse(expr) {
    const [m, h, , , dow] = expr.trim().split(/\s+/);
    return { m: field(m, 0, 59), h: field(h, 0, 23), dow: field(dow, 0, 7) };
  }
  // All run times between from and to (ms) for a list of cron expressions
  function between(crons, from, to) {
    const out = [];
    const ps = crons.filter(valid).map(parse);
    const d = new Date(from); d.setMinutes(0, 0, 0);
    for (let t = +d; t <= to; t += 3600e3) {
      const x = new Date(t);
      ps.forEach((p) => {
        if (!p.dow.has(x.getDay()) || !p.h.has(x.getHours())) return;
        p.m.forEach((min) => { const ms = t + min * 60e3; if (ms > from && ms <= to) out.push(ms); });
      });
    }
    return [...new Set(out)].sort((a, b) => a - b);
  }
  const next = (crons, n = 5, from = Date.now()) => between(crons, from, from + 15 * 864e5).slice(0, n);

  // Minutes-of-week (Mon 00:00 = 0) for every run in a week
  function weekMinutes(crons) {
    const out = new Set();
    crons.filter(valid).map(parse).forEach((p) => p.dow.forEach((dw) => p.h.forEach((h) => p.m.forEach((m) => out.add(((dw + 6) % 7) * 1440 + h * 60 + m)))));
    return [...out].sort((a, b) => a - b);
  }

  const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const t12 = (h, m) => `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`;
  function daysText(dow) {
    if (dow === '*') return 'every day';
    if (dow === '1-5') return 'weekdays';
    if (dow === '0,6' || dow === '6,0') return 'weekends';
    if (/^\d-\d$/.test(dow)) { const [a, b] = dow.split('-'); return `${DAY[a].slice(0, 3)} to ${DAY[b].slice(0, 3)}`; }
    const list = dow.split(',').map((d) => DAY[+d % 7] + 's');
    return list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0];
  }
  function human(expr) {
    if (!valid(expr)) return 'Not a valid cron expression';
    const [m, h, , , dow] = expr.trim().split(/\s+/);
    const days = daysText(dow);
    const on = dow === '*' ? '' : (days === 'weekdays' || days === 'weekends' ? ' on ' + days : ' on ' + days);
    if (m.startsWith('*/')) return `Every ${m.slice(2)} minutes${h !== '*' ? ` between ${t12(+h.split('-')[0], 0)} and ${t12(+(h.split('-')[1] || 23), 0)}` : ''}${on}`;
    if (h.includes('/')) {
      const [rng, step] = h.split('/');
      const span = rng === '*' ? '' : ` between ${t12(+rng.split('-')[0], 0)} and ${t12(+rng.split('-')[1], 0)}`;
      return `Every ${step} hours${span}${on}`;
    }
    const hours = [...field(h, 0, 23)].sort((a, b) => a - b);
    const mins = [...field(m, 0, 59)];
    const times = hours.flatMap((hh) => mins.map((mm) => t12(hh, mm)));
    const tt = times.length > 1 ? times.slice(0, -1).join(', ') + ' and ' + times[times.length - 1] : times[0];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    return dow === '*' ? `Every day at ${tt}` : `${cap(days)} at ${tt}`;
  }
  return { valid, parse, between, next, weekMinutes, human, t12 };
})();

const cronsHuman = (crons) => crons.map((c, i) => { const h = Cron.human(c); return i ? h.charAt(0).toLowerCase() + h.slice(1) : h; }).join(', plus ');

/* ---------- Natural language to cron (the mock stand-in for the scheduling model) ----------
   Handles: weekdays/weekends/named days/ranges, times (7am, 6:30pm, noon, morning, night),
   "every N minutes/hours", "between 8am and 6pm", "twice a day", and several schedules joined
   with "plus" or ";". Returns { crons, human, assumptions } or null. */
function parseSchedule(text) {
  const parts = String(text).toLowerCase().replace(/[.!?]/g, ' ').split(/\s*(?:\bplus\b|;|\band also\b|\bas well as\b)\s*/).map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return null;
  const crons = [], assumptions = [];
  for (const p of parts) {
    const r = parseSchedulePart(p, assumptions);
    if (!r) return null;
    crons.push(...r);
  }
  return { crons, human: cronsHuman(crons), assumptions };
}

function parseSchedulePart(p, assumptions) {
  const DOW = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const dayRe = /\b(sun|mon|tue|wed|thu|fri|sat)(?:day|days|s|sday|sdays|nesday|nesdays|rsday|rsdays|urday|urdays)?\b/g;
  let dow = '*', recognised = false;
  if (/\b(week ?days?|business days|work ?days|monday to friday|mon to fri|mon-fri)\b/.test(p)) { dow = '1-5'; recognised = true; }
  else if (/\bweekends?\b/.test(p)) { dow = '0,6'; recognised = true; }
  else {
    const range = p.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*(?:-|to|through|until)\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*/);
    if (range) { dow = DOW[range[1]] + '-' + DOW[range[2]]; recognised = true; }
    else {
      const names = [...p.matchAll(dayRe)].map((m) => DOW[m[1]]);
      if (names.length) { dow = [...new Set(names)].sort().join(','); recognised = true; }
    }
  }
  if (/\b(every ?day|daily|each day|every morning|every night|every evening)\b/.test(p)) recognised = true;

  // hour window: "between 8am and 6pm", "during work hours"
  let win = null;
  const bw = p.match(/between\s+(\d{1,2})(?::\d{2})?\s*(am|pm)?\s+and\s+(\d{1,2})(?::\d{2})?\s*(am|pm)?/);
  if (bw) win = [to24(+bw[1], bw[2] || (bw[4] === 'pm' && +bw[1] > +bw[3] ? 'am' : bw[4])), to24(+bw[3], bw[4])];
  else if (/\b(work(ing)? hours|business hours|office hours)\b/.test(p)) { win = [8, 18]; assumptions.push('Work hours read as 8am to 6pm'); }

  const everyMin = p.match(/every\s+(\d+)\s*(?:mins?|minutes?)\b/);
  if (everyMin) {
    const n = Math.max(5, Math.min(59, +everyMin[1]));
    if (n !== +everyMin[1]) assumptions.push('Sweeps run at most every 5 minutes, to stay polite to job sites');
    return [`*/${n} ${win ? win[0] + '-' + win[1] : '*'} * * ${dow}`];
  }
  const everyHr = p.match(/every\s+(\d+|an?|one|two|three|four|six|twelve)?\s*(?:hrs?|hours?)\b/) || (/\bhourly\b/.test(p) ? [0, '1'] : null);
  if (everyHr) {
    const words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, six: 6, twelve: 12 };
    const n = everyHr[1] ? (words[everyHr[1]] || +everyHr[1]) : 1;
    return [`0 ${win ? win[0] + '-' + win[1] : '*'}${n > 1 ? '/' + n : ''} * * ${dow}`.replace(/^0 \*\/1 /, '0 * ')];
  }

  // times
  const times = [];
  const re = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(\d{1,2}):(\d{2})\b|\bat\s+(\d{1,2})(?![:\d]|\s*(?:am|pm|mins?|minutes?|hours?|hrs?)\b)|\b(noon|midday|midnight|lunchtime|lunch|first thing|morning|afternoon|evening|tonight|night)\b/g;
  let m;
  while ((m = re.exec(p))) {
    if (m[1]) times.push([to24(+m[1], m[3]), +(m[2] || 0)]);
    else if (m[4]) times.push([+m[4] % 24, +m[5]]);
    else if (m[6]) { const hh = +m[6]; const h24 = hh < 7 ? hh + 12 : hh; times.push([h24, 0]); assumptions.push(`"at ${hh}" read as ${Cron.t12(h24, 0)}`); }
    else {
      const w = { noon: [12, 0], midday: [12, 0], midnight: [0, 0], lunchtime: [12, 30], lunch: [12, 30], 'first thing': [7, 0], morning: [8, 0], afternoon: [15, 0], evening: [18, 0], tonight: [20, 0], night: [20, 0] }[m[7]];
      times.push(w);
      if (!['noon', 'midday', 'midnight'].includes(m[7])) assumptions.push(`"${m[7]}" read as ${Cron.t12(w[0], w[1])}`);
    }
  }
  if (/\btwice (a|per) day|twice daily\b/.test(p) && !times.length) { times.push([8, 0], [17, 0]); assumptions.push('Twice a day read as 8am and 5pm'); }
  if (/\b(three times|3 times) (a|per) day\b/.test(p) && !times.length) { times.push([8, 0], [12, 0], [17, 0]); assumptions.push('Three times a day read as 8am, 12pm and 5pm'); }
  if (!times.length) {
    if (!recognised) return null;
    times.push([9, 0]);
    assumptions.push('No time given, so 9:00am');
  }
  // same minute: one cron with an hour list; otherwise one cron per time
  const byMin = {};
  times.forEach(([h, mm]) => { (byMin[mm] = byMin[mm] || new Set()).add(h); });
  return Object.entries(byMin).map(([mm, hs]) => `${+mm} ${[...hs].sort((a, b) => a - b).join(',')} * * ${dow}`);

  function to24(h, ap) { if (ap === 'pm' && h < 12) return h + 12; if (ap === 'am' && h === 12) return 0; return h % 24; }
}

/* How long a matching job waits before a sweep sees it, from the 8-week posting heatmap */
function scheduleFreshness(crons) {
  const runs = Cron.weekMinutes(crons);
  if (!runs.length) return null;
  const grid = JOBS_MOCK.postingHeat;
  let total = 0, weight = 0, within4 = 0;
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
    const c = grid[d][h];
    if (!c) continue;
    const post = d * 1440 + h * 60 + 30;
    const nxt = runs.find((r) => r >= post);
    const wait = (nxt != null ? nxt - post : runs[0] + 10080 - post) / 60;
    total += wait * c; weight += c; if (wait <= 4) within4 += c;
  }
  return { hours: total / weight, within4: Math.round((within4 / weight) * 100), runsPerWeek: runs.length };
}

function heatRuns(sweeps) {
  const out = [];
  sweeps.forEach((s) => {
    const seen = new Set();
    Cron.weekMinutes(s.crons || s.schedule.crons).forEach((mw) => {
      const dow = Math.floor(mw / 1440), hour = Math.floor((mw % 1440) / 60), minute = mw % 60;
      const key = dow + ':' + hour;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ dow, hour, minute, color: s.color || sweepColor(s.id), name: s.name });
    });
  });
  return out;
}

/* ---------- Scheduler widget (wizard step and the Edit schedule modal) ---------- */
const SCHEDULE_EXAMPLES = ['Every weekday at 7am', 'Every 6 hours', 'Weekdays at 7am and 10:30am', 'Mondays and Thursdays at 8:30am plus Sunday night', 'Every 2 hours between 8am and 6pm on weekdays'];

function schedulerHtml(sched) {
  return `
  <div class="sch">
    <label class="instr-label" for="sch-text">When should it run? <span class="optional">say it however you like</span></label>
    <div class="sch-input">
      <span class="sch-input-ic">${icon('spark', 15)}</span>
      <input id="sch-text" data-sch-text value="${esc(sched.text)}" placeholder="e.g. every weekday at 7am, plus Sunday night" autocomplete="off">
    </div>
    <div class="chips sch-examples">${SCHEDULE_EXAMPLES.map((x) => `<button type="button" class="chip chip-btn" data-sch-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="sch-out" data-sch-out aria-live="polite"></div>
    <div class="sch-grid">
      <div>
        <div class="sch-sub"><strong>When matching jobs get posted</strong><span class="muted small">Last 8 weeks, Australia/Sydney. Rings are your runs.</span></div>
        <div data-sch-heat></div>
        <div class="sch-insight" data-sch-insight></div>
      </div>
      <div>
        <div class="sch-sub"><strong>Next runs</strong></div>
        <ol class="sch-next" data-sch-next></ol>
      </div>
    </div>
  </div>`;
}

function bindScheduler(root, sched, { name = 'This sweep', color = SWEEP_COLORS[0], onChange } = {}) {
  const input = $('[data-sch-text]', root);
  const out = $('[data-sch-out]', root);
  const heat = Viz.heatmap($('[data-sch-heat]', root), JOBS_MOCK.postingHeat, { runs: [] });
  let seq = 0;
  let editingCron = false;

  function paintResult() {
    const crons = sched.crons;
    out.innerHTML = `
      <div class="sch-result">
        <span class="sch-ok">${icon('check', 14)}</span>
        <div class="sch-result-main">
          <div><strong>${esc(cronsHuman(crons))}</strong> <span class="muted small">Australia/Sydney</span></div>
          ${editingCron
            ? `<div class="sch-cron-edit"><input data-cron-input value="${esc(crons.join('; '))}" aria-label="Cron expressions, separated by semicolons" spellcheck="false"><button type="button" class="btn btn-sm btn-ghost" data-cron-done>Done</button></div><div class="field-error" data-cron-err hidden></div>`
            : `<div class="sch-crons">${crons.map((c) => `<code>${esc(c)}</code>`).join('')}<button type="button" class="link-btn" data-cron-edit>${icon('pencil', 12)} Edit cron</button></div>`}
          ${sched.assumptions && sched.assumptions.length ? `<ul class="sch-assume">${sched.assumptions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
        </div>
        <span class="muted small sch-by">Read by ${esc(JUDGE_MODEL)}</span>
      </div>`;
    const ed = $('[data-cron-edit]', out);
    if (ed) ed.onclick = () => { editingCron = true; paintResult(); $('[data-cron-input]', out).focus(); };
    const done = $('[data-cron-done]', out);
    if (done) done.onclick = () => {
      const list = $('[data-cron-input]', out).value.split(';').map((x) => x.trim()).filter(Boolean);
      const bad = list.find((c) => !Cron.valid(c));
      if (!list.length || bad) { const e = $('[data-cron-err]', out); e.hidden = false; e.textContent = bad ? `"${bad}" isn't a valid 5-field cron expression (minute hour day month weekday).` : 'Add at least one cron expression.'; return; }
      sched.crons = list; sched.assumptions = []; sched.text = cronsHuman(list);
      input.value = sched.text; editingCron = false; paintAll();
    };
    // next runs
    $('[data-sch-next]', root).innerHTML = Cron.next(crons, 6).map((ms, i) => {
      const d = new Date(ms);
      return `<li><span class="sch-next-day">${d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span><span>${d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</span>${i === 0 ? `<span class="pill pill-ok">${untilLabel(ms)}</span>` : ''}</li>`;
    }).join('') || '<li class="muted">No upcoming runs</li>';
    // heatmap + freshness insight
    heat.update({ runs: heatRuns([{ id: 'x', name, color, crons }]) });
    const f = scheduleFreshness(crons);
    const better = suggestBetter(crons, f);
    $('[data-sch-insight]', root).innerHTML = f ? `
      <p>${icon('clock', 14)} Matching jobs reach you <strong>${f.hours.toFixed(1)} hours</strong> after they're posted, on average. ${f.within4}% arrive within 4 hours. That's ${f.runsPerWeek} ${f.runsPerWeek === 1 ? 'run' : 'runs'} a week.</p>
      ${better ? `<div class="sch-suggest">${icon('spark', 14)}<div><strong>Suggestion:</strong> most matching jobs go up Tuesday to Thursday between 8 and 10am. "${esc(better.text)}" would cut the wait to ${better.hours.toFixed(1)} hours.</div><button type="button" class="btn btn-sm btn-ghost" data-sch-apply="${esc(better.text)}">Use this</button></div>` : ''}` : '';
    const ap = $('[data-sch-apply]', root);
    if (ap) ap.onclick = () => { input.value = ap.dataset.schApply; interpret(); };
  }
  function paintAll() { paintResult(); if (onChange) onChange(sched); }

  async function interpret() {
    const text = input.value.trim();
    const my = ++seq;
    if (!text) { out.innerHTML = ''; return; }
    out.innerHTML = `<div class="sch-thinking"><span class="spinner"></span> Reading your schedule…</div>`;
    await sleep(reducedMotion() ? 0 : 520);
    if (my !== seq || !out.isConnected) return;
    const r = parseSchedule(text);
    if (!r) {
      out.innerHTML = `<div class="callout callout-warn">${icon('alert', 16)}<div><strong>I couldn't turn that into a schedule.</strong> Try a day and a time, like "every weekday at 7am" or "every 4 hours". Your last working schedule is kept.</div></div>`;
      return;
    }
    sched.text = text; sched.crons = r.crons; sched.assumptions = r.assumptions;
    editingCron = false;
    paintAll();
  }
  const deb = debounce(interpret, 450);
  input.addEventListener('input', deb);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); interpret(); } });
  $$('[data-sch-ex]', root).forEach((b) => (b.onclick = () => { input.value = b.dataset.schEx; interpret(); }));
  paintResult();
  return () => heat.destroy();
}

function suggestBetter(crons, f) {
  if (!f || f.hours < 2.5) return null;
  const candidates = ['Weekdays at 7am and 10:30am', 'Every 2 hours between 8am and 6pm on weekdays', 'Weekdays at 9am, 11am and 3pm'];
  const scored = candidates.map((text) => { const r = parseSchedule(text); return { text, hours: scheduleFreshness(r.crons).hours }; })
    .filter((c) => c.hours < f.hours - 1).sort((a, b) => a.hours - b.hours);
  return scored[0] || null;
}

/* ---------- Pipeline handoff ---------- */
function tailorJob(job, mode) {
  const st = Store.state;
  if (mode === 'auto') st.quickDraft = { jdText: job.text, jobId: job.id, autoStart: true };
  else st.newDraft = { stage: 'jd', jdText: job.text, brief: null, selected: null, jobId: job.id };
  Store.saveNow();
  location.hash = mode === 'auto' ? '#/new/quick' : '#/new/studio';
}

function linkProjectToJob(p, jobId) {
  const r = jobsState();
  const j = r.jobs.find((x) => x.id === jobId);
  if (!j) return;
  j.status = 'tailored';
  j.projectId = p.id;
  p.jobId = jobId;
  assignVariant(p);
}

// Instant project for batch and auto-tailor runs (Quick generate with your defaults)
function makeProjectForJob(job) {
  const st = Store.state;
  const brief = Docs.extractBrief(job.text);
  const p = Docs.createProject(st.kb, job.text, brief, Docs.suggestSelection(st.kb, brief));
  applyQuickPrefs(p, quickPrefs());
  st.projects.push(p);
  linkProjectToJob(p, job.id);
  return p;
}

// onSettled runs once both the batch has finished and the modal is gone, so the caller can re-render safely
function batchTailor(jobs, onSettled) {
  let closed = false, finished = false;
  const settle = () => { if (closed && finished && onSettled) { onSettled(); onSettled = null; } };
  const stagesFor = (j) => ['Reading the job description', 'Matching your experience', 'Writing your resume and cover letter', 'Fitting to 2 pages', 'Running checks'];
  openModal({
    title: `Tailoring ${jobs.length} ${jobs.length === 1 ? 'resume' : 'resumes'}`,
    wide: true,
    body: `<p class="muted small">Quick generate runs for each job in turn, with your default theme and page budget. You can close this window and it keeps going.</p>
      <ol class="bq-list">${jobs.map((j) => `<li data-bq="${j.id}">
        <span class="bq-state" data-bq-state><span class="bq-wait"></span></span>
        <div class="bq-main"><div class="bq-title"><strong>${esc(j.title)}</strong><span class="muted"> · ${esc(j.company)}</span></div>
        <div class="bar"><div class="bar-fill" data-bq-fill style="width:0%"></div></div>
        <span class="muted small" data-bq-note>Queued</span></div>
        <span data-bq-link></span></li>`).join('')}</ol>`,
    actions: [{ label: 'Close', kind: 'btn-ghost', fn: () => { closed = true; setTimeout(settle, 200); } }],
    onMount: async (m) => {
      // Escape or a backdrop click also closes it
      const obs = new MutationObserver(() => { if (!m.contains(m.querySelector('.bq-list'))) { closed = true; obs.disconnect(); settle(); } });
      obs.observe(m, { childList: true });
      const made = [];
      for (const j of jobs) {
        const li = $(`[data-bq="${j.id}"]`, m);
        const live = () => li && li.isConnected;
        if (live()) { $('[data-bq-state]', li).innerHTML = '<span class="spinner"></span>'; li.classList.add('on'); }
        const stages = stagesFor(j);
        for (let i = 0; i < stages.length; i++) {
          if (live()) { $('[data-bq-note]', li).textContent = stages[i] + '…'; $('[data-bq-fill]', li).style.width = ((i + 1) / stages.length) * 100 + '%'; }
          await sleep(reducedMotion() ? 60 : 380 + Math.random() * 260);
        }
        const p = makeProjectForJob(j);
        made.push(p);
        Store.saveNow();
        if (live()) {
          li.classList.remove('on'); li.classList.add('done');
          $('[data-bq-state]', li).innerHTML = icon('check', 14);
          $('[data-bq-note]', li).textContent = 'Resume and cover letter ready';
          $('[data-bq-link]', li).innerHTML = `<a class="btn btn-sm btn-ghost" href="#/project/${p.id}/overview">Open</a>`;
        }
      }
      toast(`${made.length} ${made.length === 1 ? 'application is' : 'applications are'} ready to review`, { action: { label: 'View applications', fn: () => (location.hash = '#/dashboard') } });
      finished = true;
      settle();
    },
  });
}

/* ---------- Shared page chrome ----------
   Layout rules for Jobs: one primary action per view, the explanation one hover away (data-tip),
   rarely used things behind a "…" menu or a collapsed section. */
const JOB_TIPS = {
  score: 'Match score, 0 to 100: how well the job fits your search profile and knowledge base, as judged by the AI.',
  judge: `A language model (${'claude-haiku-5-5'}) reads each job that passed the rules and scores it against your own description of the job you want.`,
  fresh: 'Found in the last 12 hours',
  missing: "Asked for in the ad, but your knowledge base has no evidence of it yet. The resume pipeline will flag it, not invent it.",
  matched: 'Asked for in the ad, and backed by your knowledge base',
  auto: 'Quick generate: a finished resume and cover letter in about 15 seconds. Gaps are flagged, never blocking.',
  manual: 'Studio: check the job brief, choose which experience to use, then edit each section before you export.',
};

function jobsHeader(active) {
  const r = jobsState();
  const n = r.jobs.filter((j) => j.status === 'new').length;
  const nx = nextSweepRun();
  return `
    <div class="jx-head">
      <h1>Jobs</h1>
      <p class="muted">Your sweeps search job sites on a schedule and keep the jobs worth your time. Pick one and tailor your resume for it.</p>
    </div>
    <div class="jx-tabbar">
      <nav class="jb-tabs" aria-label="Jobs sections">
        <a href="#/jobs" class="${active === 'inbox' ? 'on' : ''}" ${active === 'inbox' ? 'aria-current="page"' : ''}>Matches${n ? ` <span class="count count-warn" data-tip="${n} new since you last looked">${n}</span>` : ''}</a>
        <a href="#/jobs/sweeps" class="${active === 'sweeps' ? 'on' : ''}" ${active === 'sweeps' ? 'aria-current="page"' : ''} data-tip="Scheduled searches of the job sites you pick">Sweeps <span class="count">${r.sweeps.length}</span></a>
      </nav>
      ${nx ? `<span class="jx-next" data-tip="${esc(`${nx.sweep.name} runs ${new Date(nx.at).toLocaleString('en-AU', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}`)}" tabindex="0"><span class="jb-next-dot"></span>Next sweep ${untilLabel(nx.at)}</span>` : '<span class="muted small">No sweeps scheduled</span>'}
    </div>`;
}

function nextSweepRun() {
  const r = jobsState();
  let best = null;
  r.sweeps.filter((s) => s.active).forEach((s) => { const n = Cron.next(s.schedule.crons, 1)[0]; if (n && (!best || n < best.at)) best = { at: n, sweep: s }; });
  return best;
}

Views.jobs = function (root, params) {
  insightState();
  if (params[0] === 'sweeps') return sweepsView(root);
  // Applications moved to the home page; old links land on the right application
  if (params[0] === 'apps') { location.replace('#/dashboard'); return; }
  if (params[0] === 'app') { const j = jobsState().jobs.find((x) => x.id === params[1]); location.replace(j && j.projectId ? `#/project/${j.projectId}/overview` : '#/dashboard'); return; }
  if (params[0] === 'new') return sweepWizard(root);
  if (params[0] === 'run') return sweepRunView(root, params[1]);
  return inboxView(root);
};

function rejectedModal() {
  openModal({
    title: 'Filtered out in the last run', wide: true,
    body: `<p class="muted small">Check the sweep isn't too strict. If one of these should have been kept, keep it and similar jobs will pass next time.</p>
      <table class="jb-rej-table"><thead><tr><th>Job</th><th>Removed by</th><th>Why</th><th></th></tr></thead><tbody>
      ${JOBS_MOCK.rejected.map((x, i) => `<tr><td>${platformBadge(x.platform)} <strong>${esc(x.title)}</strong><div class="muted small">${esc(x.company)}</div></td><td><span class="pill">${esc(x.stage)}</span></td><td class="small">${esc(x.reason)}</td><td><button class="btn btn-sm btn-ghost" data-rescue="${i}">Keep it</button></td></tr>`).join('')}
      </tbody></table>`,
    actions: [{ label: 'Done', kind: 'btn-primary' }],
    onMount(m) {
      $$('[data-rescue]', m).forEach((b) => (b.onclick = () => {
        const x = JOBS_MOCK.rejected[+b.dataset.rescue];
        b.closest('tr').classList.add('jb-rescued');
        b.outerHTML = `<span class="small muted">${icon('check', 13)} Kept</span>`;
        toast(`Kept. Jobs like "${x.title}" won't be removed for that reason again.`);
      }));
    },
  });
}

/* ---------- Matches ---------- */
function inboxView(root) {
  const r = jobsState();
  const ui = r.ui;
  if (!['foryou', 'saved', 'progress', 'all'].includes(ui.filter)) ui.filter = 'foryou';
  const picked = new Set();
  let tailorMode = 'auto';
  const inProgress = (j) => ['tailored', 'applied', 'interview', 'offer'].includes(j.status);

  function visibleJobs() {
    let js = r.jobs.filter((j) => j.status !== 'dismissed');
    if (ui.filter === 'foryou') js = js.filter((j) => j.status === 'new');
    if (ui.filter === 'saved') js = js.filter((j) => j.status === 'saved');
    if (ui.filter === 'progress') js = js.filter(inProgress);
    if (ui.platform !== 'all') js = js.filter((j) => j.platform === ui.platform);
    if (ui.hideFake) js = js.filter((j) => listingCheck(j).verdict !== 'fake');
    return js.sort(ui.sort === 'newest' ? (a, b) => b.foundAt - a.foundAt : (a, b) => b.score - a.score);
  }

  function card(j) {
    const fresh = Date.now() - j.foundAt < 12 * 3600e3 && j.status === 'new';
    return `
    <article class="jb-card ${ui.selected === j.id ? 'on' : ''} ${picked.has(j.id) ? 'picked' : ''}" data-job="${j.id}" tabindex="0" aria-label="${esc(j.title)} at ${esc(j.company)}, score ${j.score}">
      ${scoreRing(j.score)}
      <div class="jb-card-main">
        <div class="jb-card-title">${fresh ? `<span class="jb-fresh" data-tip="${JOB_TIPS.fresh}"></span>` : ''}<strong>${esc(j.title)}</strong></div>
        <div class="jb-card-co">${esc(j.company)}, ${esc(j.location.replace(/ [A-Z]{2,3}$/, ''))}</div>
        <div class="jb-card-meta">${platformBadge(j.platform)}<span class="muted small">${hoursLabel(j.foundAt)}</span>${checkBadge(j)}${j.status !== 'new' ? `<span class="pill ${inProgress(j) ? 'pill-ok' : ''}">${STATUS_LABEL[j.status]}</span>` : ''}</div>
      </div>
      <label class="jb-check" data-tip="Select to tailor several at once"><input type="checkbox" data-pick="${j.id}" ${picked.has(j.id) ? 'checked' : ''} aria-label="Select ${esc(j.company)}"></label>
    </article>`;
  }

  function detail(j) {
    if (!j) return `<div class="jx-empty-detail"><p class="muted">Pick a job to see why it was kept and to tailor your resume for it.</p></div>`;
    const parts = ['Skills', 'Seniority', 'Location', 'Salary', 'Work rights'];
    const partTips = ['How much of what they ask for your knowledge base can back up', 'Their level compared with yours', 'Their location and work type compared with yours', 'Their range compared with your salary floor', 'Whether your work rights meet theirs'];
    const proj = j.projectId && Store.project(j.projectId);
    const sweep = r.sweeps.find((s) => s.id === j.sweep);
    return `
    <div class="jd-top">
      <div class="jd-title">
        <h2>${esc(j.title)}</h2>
        <p class="jd-co">${esc(j.company)}</p>
        <p class="muted small">${esc(j.location)}, ${esc(j.mode.toLowerCase())}. ${esc(j.salary)}.</p>
      </div>
      <div class="jd-tools">
        <button class="icon-btn ${j.status === 'saved' ? 'on' : ''}" data-save aria-pressed="${j.status === 'saved'}" data-tip="${j.status === 'saved' ? 'Saved. Click to unsave.' : 'Save for later'}" aria-label="Save for later">${icon('bookmark', 16)}</button>
        <button class="icon-btn" data-dismiss data-tip="Not for me: hide it, and rank jobs like it lower" aria-label="Not for me">${icon('eyeOff', 16)}</button>
        <button class="icon-btn" data-ext data-tip="Open the original ad on ${esc(platformOf(j.platform).name)}" aria-label="Open the original ad">${icon('external', 16)}</button>
      </div>
    </div>

    ${listingCheckHtml(j, r.ui.lcOpen || listingCheck(j).verdict === 'fake')}
    ${proj && inProgress(j) ? `
      <div class="jd-cta jd-cta-done">
        <div><strong>${icon('check', 15)} In your applications</strong><p class="muted small">Tailored ${timeAgo(proj.updatedAt)}. Documents, the saved ad and people to contact are all there.</p></div>
        <div class="row-gap">
          ${stageSelect(proj, 'data-status')}
          <a class="btn btn-primary" href="#/project/${proj.id}/overview">Open application</a>
        </div>
      </div>` : `
      <div class="jd-cta">
        <div class="jd-modes" role="radiogroup" aria-label="How to tailor">
          <button role="radio" aria-checked="${tailorMode === 'auto'}" class="jd-mode ${tailorMode === 'auto' ? 'on' : ''}" data-mode="auto" data-tip="${esc(JOB_TIPS.auto)}">${icon('zap', 15)}<span><strong>Automatic</strong><span class="muted small">Finished in about 15s</span></span></button>
          <button role="radio" aria-checked="${tailorMode === 'manual'}" class="jd-mode ${tailorMode === 'manual' ? 'on' : ''}" data-mode="manual" data-tip="${esc(JOB_TIPS.manual)}">${icon('layers', 15)}<span><strong>Manual</strong><span class="muted small">Edit it yourself in Studio</span></span></button>
        </div>
        <button class="btn ${listingCheck(j).verdict === 'fake' ? 'btn-ghost' : 'btn-primary'} jd-go" data-tailor>${icon('spark')} ${listingCheck(j).verdict === 'fake' ? 'Tailor anyway' : tailorMode === 'auto' ? 'Generate resume' : 'Open in Studio'}</button>
      </div>`}

    <section class="jd-sec">
      <div class="jd-sec-head"><h3>Why it's a match</h3><span class="jd-score" data-tip="${esc(JOB_TIPS.score)}" tabindex="0">${scoreRing(j.score, 'sm', false)}</span></div>
      <p>${esc(j.reason)}</p>
      <div class="jd-kw">
        <div class="chips">${j.keywords.map((k) => `<span class="chip chip-ok" data-tip="${esc(JOB_TIPS.matched)}">${esc(k)}</span>`).join('')}</div>
        ${j.missing.length ? `<div class="chips">${j.missing.map((k) => `<span class="chip chip-missing" data-tip="${esc(JOB_TIPS.missing)}">${icon('alert', 12)} ${esc(k)}</span>`).join('')}</div>` : ''}
      </div>
    </section>
    <details class="jd-more">
      <summary>Score breakdown</summary>
      <div class="jb-parts">${parts.map((p, i) => `<div class="jb-part" data-tip="${esc(partTips[i])}"><span>${p}</span><div class="bar"><div class="bar-fill ${j.parts[i] < 0.8 ? 'bar-warn' : ''}" style="width:${Math.round(j.parts[i] * 100)}%"></div></div><span class="muted small">${Math.round(j.parts[i] * 100)}</span></div>`).join('')}</div>
      <p class="muted small">Scored by the AI judge ${infoTip(JOB_TIPS.judge, 'AI judge')}</p>
    </details>
    <details class="jd-more">
      <summary>Job ad</summary>
      <pre class="jd-ad">${esc(j.text)}</pre>
    </details>
    <p class="muted small jd-source">Found ${hoursLabel(j.foundAt)} on ${esc(platformOf(j.platform).name)} by your "${esc(sweep ? sweep.name : 'deleted')}" sweep.</p>`;
  }

  function render() {
    const js = visibleJobs();
    if (!js.find((j) => j.id === ui.selected)) ui.selected = js[0] ? js[0].id : null;
    const all = r.jobs.filter((j) => j.status !== 'dismissed');
    const counts = { foryou: all.filter((j) => j.status === 'new').length, saved: all.filter((j) => j.status === 'saved').length, progress: all.filter(inProgress).length, all: all.length };
    const tabTips = { foryou: 'New jobs you haven\'t acted on yet', saved: 'Jobs you saved for later', progress: 'Tailored, applied, interviewing or offered', all: 'Everything your sweeps kept' };
    const firstSweep = (r.sweeps.find((s) => s.active) || r.sweeps[0] || {}).id;
    root.innerHTML = shell(`
      ${jobsHeader('inbox')}
      <div class="jb-toolbar">
        <div class="seg" role="tablist" aria-label="Show">${[['foryou', 'New'], ['saved', 'Saved'], ['progress', 'In progress'], ['all', 'All']].map(([k, l]) => `<button role="tab" aria-selected="${ui.filter === k}" class="${ui.filter === k ? 'on' : ''}" data-filter="${k}" data-tip="${tabTips[k]}">${l}${counts[k] ? ` <span class="count">${counts[k]}</span>` : ''}</button>`).join('')}</div>
        <div class="row-gap">
          <label class="sr-only" for="jb-sort">Sort</label>
          <select id="jb-sort" class="jb-select" data-sort data-tip="Sort the list"><option value="score" ${ui.sort === 'score' ? 'selected' : ''}>Best match</option><option value="newest" ${ui.sort === 'newest' ? 'selected' : ''}>Newest</option></select>
          <button class="icon-btn jx-more" data-more aria-haspopup="menu" aria-expanded="false" aria-label="More" data-tip="Filter by site, run a sweep, audit filtered-out jobs">${icon('dots', 16)}</button>
        </div>
      </div>
      ${ui.platform !== 'all' ? `<div class="jx-filter-note"><span class="chip">${platformBadge(ui.platform)} Only ${esc(platformOf(ui.platform).name)}<button data-clear-pf aria-label="Show all sites" data-tip="Show all sites">${icon('x', 11)}</button></span></div>` : ''}
      ${js.length ? `
      <div class="jb-split">
        <div>
          <div class="jb-list" role="list">${js.map(card).join('')}</div>
          <p class="muted small jx-listfoot">${JOBS_MOCK.rejected.length} jobs were filtered out in the last run. <button class="link-btn" data-show-rej>Check them</button></p>
        </div>
        <aside class="jb-detail panel" data-detail aria-live="polite">${detail(r.jobs.find((j) => j.id === ui.selected))}</aside>
      </div>` : `
      <div class="empty-state"><div class="empty-icon">${icon('radar', 26)}</div>
        <h3>${ui.filter === 'foryou' ? "You're all caught up" : ui.filter === 'saved' ? 'Nothing saved yet' : ui.filter === 'progress' ? 'No applications in progress' : 'No matches yet'}</h3>
        <p class="muted">${ui.filter === 'foryou' ? 'New matches land here after each sweep.' : ui.filter === 'saved' ? 'Save a job with the bookmark to come back to it.' : ui.filter === 'progress' ? 'Tailor a resume for a match and it moves here.' : 'Run a sweep to find jobs.'}</p>
        ${firstSweep ? `<a class="btn btn-primary" href="#/jobs/run/${firstSweep}">${icon('play', 14)} Run a sweep now</a>` : `<a class="btn btn-primary" href="#/jobs/new">${icon('plus')} Create a sweep</a>`}</div>`}
      <div class="jb-bulk" data-bulk ${picked.size ? '' : 'hidden'}>
        <span><strong data-bulk-n>${picked.size}</strong> selected</span>
        <button class="btn btn-primary btn-sm" data-bulk-tailor data-tip="Run Quick generate for each selected job, one after another">${icon('zap', 14)} Tailor all</button>
        <button class="btn btn-ghost btn-sm" data-bulk-dismiss>Not for me</button>
        <button class="icon-btn" data-bulk-clear aria-label="Clear selection" data-tip="Clear selection">${icon('x', 15)}</button>
      </div>
    `, { route: 'jobs', title: '<span>Jobs</span>', actions: firstSweep ? `<a class="btn btn-ghost" href="#/jobs/run/${firstSweep}" data-tip="Search your sites now instead of waiting for the schedule">${icon('play', 14)} Run sweep now</a>` : '' });
    bindShell(root);
    bind();
  }

  function renderDetail() {
    const el = $('[data-detail]', root);
    if (!el) return render();
    el.innerHTML = detail(r.jobs.find((j) => j.id === ui.selected));
    $$('.jb-card', root).forEach((c) => c.classList.toggle('on', c.dataset.job === ui.selected));
    bindDetail();
  }

  function bindDetail() {
    const j = r.jobs.find((x) => x.id === ui.selected);
    if (!j) return;
    $$('[data-mode]', root).forEach((b) => (b.onclick = () => { tailorMode = b.dataset.mode; renderDetail(); $(`[data-mode="${tailorMode}"]`, root).focus(); }));
    const t = $('[data-tailor]', root);
    if (t) t.onclick = () => tailorJob(j, tailorMode);
    $('[data-save]', root).onclick = () => { j.status = j.status === 'saved' ? 'new' : 'saved'; Store.save(); render(); toast(j.status === 'saved' ? 'Saved for later' : 'Removed from saved'); };
    $('[data-dismiss]', root).onclick = () => {
      const prev = j.status; j.status = 'dismissed'; Store.save(); render();
      toast(`Hidden. Jobs like ${j.company}'s will rank lower.`, { action: { label: 'Undo', fn: () => { j.status = prev; Store.save(); render(); } } });
    };
    $('[data-ext]', root).onclick = () => toast(`Would open the original ad on ${platformOf(j.platform).name} (mock)`);
    bindListingCheck(root, j);
    const ss = $('[data-status]', root);
    if (ss) ss.onchange = () => { setAppStage(Store.project(j.projectId), ss.value); Store.saveNow(); render(); };
  }

  function updateBulk() {
    const b = $('[data-bulk]', root);
    if (!b) return;
    b.hidden = !picked.size;
    $('[data-bulk-n]', root).textContent = picked.size;
    $('.jb-list', root) && $('.jb-list', root).classList.toggle('picking', picked.size > 0);
  }

  function bind() {
    $$('[data-job]', root).forEach((c) => {
      const go = () => { ui.selected = c.dataset.job; Store.save(); renderDetail(); if (window.innerWidth < 1040) $('[data-detail]', root).scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }); };
      c.addEventListener('click', (e) => { if (!e.target.closest('.jb-check')) go(); });
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === c) go(); });
    });
    $$('[data-pick]', root).forEach((cb) => (cb.onchange = () => { cb.checked ? picked.add(cb.dataset.pick) : picked.delete(cb.dataset.pick); cb.closest('.jb-card').classList.toggle('picked', cb.checked); updateBulk(); }));
    $$('[data-filter]', root).forEach((b) => (b.onclick = () => { ui.filter = b.dataset.filter; Store.save(); render(); }));
    const sort = $('[data-sort]', root);
    if (sort) sort.onchange = (e) => { ui.sort = e.target.value; Store.save(); render(); };
    const cp = $('[data-clear-pf]', root);
    if (cp) cp.onclick = () => { ui.platform = 'all'; Store.save(); render(); };
    const rej = $('[data-show-rej]', root);
    if (rej) rej.onclick = rejectedModal;
    $('[data-more]', root).onclick = (e) => {
      const sites = [...new Set(r.jobs.map((j) => j.platform))];
      openMenu(e.currentTarget, [
        ...sites.map((id) => ({ label: `Only ${platformOf(id).name}`, icon: ui.platform === id ? 'check' : '', fn: () => { ui.platform = id; Store.save(); render(); } })),
        ...(ui.platform !== 'all' ? [{ label: 'All sites', fn: () => { ui.platform = 'all'; Store.save(); render(); } }] : []),
        '-',
        { label: ui.hideFake ? 'Show likely fake listings' : 'Hide likely fake listings', icon: 'shield', fn: () => { ui.hideFake = !ui.hideFake; Store.save(); render(); } },
        { label: 'Check filtered-out jobs', icon: 'filter', fn: rejectedModal },
        { label: 'Show hidden jobs', icon: 'eye', fn: () => { const n = r.jobs.filter((j) => j.status === 'dismissed'); n.forEach((j) => (j.status = 'new')); Store.save(); render(); toast(n.length ? `${n.length} hidden ${n.length === 1 ? 'job is' : 'jobs are'} back` : 'No hidden jobs'); } },
        { label: 'New sweep', icon: 'plus', fn: () => (location.hash = '#/jobs/new') },
      ]);
    };
    $('[data-bulk-clear]', root).onclick = () => { picked.clear(); $$('[data-pick]', root).forEach((c) => { c.checked = false; c.closest('.jb-card').classList.remove('picked'); }); updateBulk(); };
    $('[data-bulk-dismiss]', root).onclick = () => { picked.forEach((id) => { const j = r.jobs.find((x) => x.id === id); if (j) j.status = 'dismissed'; }); const n = picked.size; picked.clear(); Store.save(); render(); toast(`Hid ${n} ${n === 1 ? 'job' : 'jobs'}`); };
    $('[data-bulk-tailor]', root).onclick = () => {
      const jobs = [...picked].map((id) => r.jobs.find((x) => x.id === id)).filter((j) => j && !j.projectId);
      if (!jobs.length) { toast('Those jobs already have tailored resumes'); return; }
      if (!Store.state.connections[Store.state.activeModel.provider]) { toast('Connect an API key in Settings first', { kind: 'warn' }); return; }
      picked.clear();
      updateBulk();
      batchTailor(jobs, () => { if (location.hash.replace(/\?.*/, '') === '#/jobs') render(); });
    };
    bindDetail();
  }

  render();
}

/* ---------- Sweeps ---------- */
const SWEEP_TIPS = {
  crawled: 'Listings found on your sites',
  deduped: 'Left after merging the same job posted on several sites',
  hard: 'Passed your exact rules: salary floor, location, work rights, avoid list',
  semantic: 'Close in meaning to your profile (compared with embeddings)',
  llm: 'Kept by the AI judge after reading each ad against what you want',
};

function sweepsView(root) {
  const r = jobsState();
  let laneChart = null;

  function laneRows() {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    return r.sweeps.map((s) => ({ name: s.name, color: sweepColor(s.id), active: s.active, times: Cron.between(s.schedule.crons, +from, +from + 7 * 864e5) }));
  }

  function lastRunLine(f) {
    if (!f) return '<span class="muted small">Hasn\'t run yet</span>';
    const steps = [['crawled', 'found'], ['deduped', 'unique'], ['hard', 'passed rules'], ['semantic', 'close in meaning'], ['llm', 'kept']];
    return `<span class="sw-run-line">
      <span class="sw-run-text"><strong>${f.crawled}</strong> found, <strong>${f.llm}</strong> kept</span>
      <span class="sw-steps" aria-label="Last run: ${steps.map(([k, l]) => `${f[k]} ${l}`).join(', ')}">${steps.map(([k, l]) => `<span class="sw-step ${k === 'llm' ? 'last' : ''}" style="--w:${Math.max(6, (Math.log(f[k] + 1) / Math.log(f.crawled + 1)) * 100)}%" data-tip="${f[k]} ${l}. ${SWEEP_TIPS[k]}."></span>`).join('')}</span>
    </span>`;
  }

  function render() {
    if (laneChart) { laneChart.destroy(); laneChart = null; }
    const p = r.profile;
    const active = r.sweeps.filter((s) => s.active).length;
    root.innerHTML = shell(`
      ${jobsHeader('sweeps')}
      <div class="jb-toolbar">
        <p class="muted small">${r.sweeps.length} ${r.sweeps.length === 1 ? 'sweep' : 'sweeps'}, ${active} running on a schedule. <button class="link-btn" data-how>How a sweep works</button></p>
        <a class="btn btn-primary btn-sm" href="#/jobs/new">${icon('plus', 14)} New sweep</a>
      </div>
      <div class="sw-list">
        ${r.sweeps.map((s) => {
          const nx = s.active ? Cron.next(s.schedule.crons, 1)[0] : null;
          return `
          <article class="sw-row ${s.active ? '' : 'sw-paused'}">
            <span class="sw-dot" style="background:${sweepColor(s.id)}"></span>
            <div class="sw-main">
              <div class="sw-title"><h3>${esc(s.name)}</h3>${s.autoTailor.on ? `<span class="pill pill-ok" data-tip="Jobs scoring ${s.autoTailor.threshold} or more get a resume made automatically. Nothing is ever sent to employers.">${icon('zap', 11)} Auto-tailor ${s.autoTailor.threshold}+</span>` : ''}</div>
              <div class="sw-meta">
                <span class="sw-sites">${s.platforms.map((id) => `<span data-tip="${esc(platformOf(id).name)}: ${esc(platformOf(id).method)}">${platformBadge(id)}</span>`).join('')}</span>
                <span class="sw-when" data-tip="${esc('Cron: ' + s.schedule.crons.join('  ·  '))}" tabindex="0">${icon('clock', 13)} ${esc(cronsHuman(s.schedule.crons))}</span>
              </div>
            </div>
            <div class="sw-last">${lastRunLine(s.lastFunnel)}</div>
            <div class="sw-actions">
              <span class="sw-next ${nx ? '' : 'muted'}">${nx ? 'Next ' + untilLabel(nx) : 'Paused'}</span>
              <label class="toggle" data-tip="${s.active ? 'Running on schedule. Click to pause.' : 'Paused. Click to resume.'}"><input type="checkbox" data-active="${s.id}" ${s.active ? 'checked' : ''}><span class="toggle-track"></span><span class="sr-only">Run on schedule</span></label>
              <a class="btn btn-sm btn-ghost" href="#/jobs/run/${s.id}" data-tip="Run this sweep now and watch it work">${icon('play', 13)} Run</a>
              <button class="icon-btn" data-row-menu="${s.id}" aria-haspopup="menu" aria-expanded="false" aria-label="More for ${esc(s.name)}" data-tip="Schedule, auto-tailor, delete">${icon('dots', 16)}</button>
            </div>
          </article>`;
        }).join('') || `<div class="empty-state"><div class="empty-icon">${icon('radar', 26)}</div><h3>No sweeps yet</h3><p class="muted">A sweep searches the job sites you pick on a schedule, and keeps only the jobs that fit.</p><a class="btn btn-primary" href="#/jobs/new">${icon('plus')} Create a sweep</a></div>`}
      </div>

      ${r.sweeps.length ? `<section class="sw-week">
        <h2>This week ${infoTip('Each tick is one scheduled run. The red line is now. Hover a tick for its time.')}</h2>
        <div data-lanes></div>
      </section>` : ''}

      <details class="jx-disclosure">
        <summary><span><strong>Search profile</strong><span class="muted small">Who the sweeps search as, and what they keep</span></span></summary>
        <div class="jx-disclosure-body">
          <dl class="sw-profile">
            <dt>Searching as</dt><dd>${p.mode === 'kb' ? `Your knowledge base (${esc(Store.state.kb.contact.name)})` : `A separate profile: ${esc(p.label)}`}</dd>
            <dt>Titles</dt><dd>${esc(p.titles.join(', '))}</dd>
            <dt>Where</dt><dd>${esc(p.locations.join(', '))}; ${esc(p.workTypes.join(' or ').toLowerCase())}</dd>
            <dt>Salary floor</dt><dd>${money(p.salaryFloor)} base</dd>
            <dt>Never show</dt><dd>${esc(p.avoid.join(', '))}</dd>
            <dt>In your words</dt><dd class="sw-ideal">"${esc(p.ideal)}"</dd>
          </dl>
          <button class="btn btn-sm btn-ghost" data-edit-profile>${icon('pencil', 13)} Edit search profile</button>
        </div>
      </details>
      <details class="jx-disclosure">
        <summary><span><strong>Run history</strong><span class="muted small">${r.runs.length} runs. ${r.runs.filter((x) => x.status !== 'ok').length ? `${r.runs.filter((x) => x.status !== 'ok').length} had problems.` : 'All ran cleanly.'}</span></span></summary>
        <div class="jx-disclosure-body">
          <table class="jb-rej-table"><thead><tr><th>Sweep</th><th>When</th><th class="num">Found</th><th class="num">Kept</th><th>Result</th></tr></thead><tbody>
            ${r.runs.slice(0, 12).map((x) => { const s = r.sweeps.find((y) => y.id === x.sweep); return `<tr><td><span class="sw-dot sw-dot-sm" style="background:${sweepColor(x.sweep)}"></span> ${esc(s ? s.name : 'Deleted sweep')}</td><td class="small">${clockTime(x.at)}</td><td class="num">${x.crawled}</td><td class="num"><strong>${x.kept}</strong></td><td>${x.status === 'ok' ? `<span class="pill pill-ok">Done in ${x.secs}s</span>` : `<span class="pill ${x.status === 'fail' ? 'pill-bad' : 'pill-warn'}" data-tip="${esc(x.note)}" tabindex="0">${x.status === 'fail' ? 'Failed' : 'Partly done'}</span>`}</td></tr>`; }).join('')}
          </tbody></table>
        </div>
      </details>
    `, { route: 'jobs', title: '<span>Jobs</span>' });
    bindShell(root);
    if (r.sweeps.length) laneChart = Viz.lanes($('[data-lanes]', root), laneRows());

    $('[data-how]', root).onclick = howSweepsWork;
    $$('[data-active]', root).forEach((cb) => (cb.onchange = () => { const s = r.sweeps.find((x) => x.id === cb.dataset.active); s.active = cb.checked; Store.save(); render(); toast(s.active ? `${s.name} resumed` : `${s.name} paused`); }));
    $$('[data-row-menu]', root).forEach((b) => (b.onclick = () => {
      const s = r.sweeps.find((x) => x.id === b.dataset.rowMenu);
      openMenu(b, [
        { label: 'Change schedule', icon: 'clock', fn: () => editScheduleModal(s, render) },
        { label: 'Auto-tailor settings', icon: 'zap', fn: () => editAutoModal(s, render) },
        '-',
        { label: 'Delete sweep', icon: 'trash', danger: true, fn: () => openModal({ title: 'Delete this sweep?', body: `<p>"${esc(s.name)}" stops running. Jobs it already found stay in Matches.</p>`, actions: [{ label: 'Cancel' }, { label: 'Delete sweep', kind: 'btn-danger-ghost', fn: () => { r.sweeps = r.sweeps.filter((x) => x !== s); Store.save(); render(); toast('Sweep deleted'); } }] }) },
      ]);
    }));
    const ep = $('[data-edit-profile]', root);
    if (ep) ep.onclick = () => editProfileModal(render);
  }

  render();
  return () => { if (laneChart) laneChart.destroy(); };
}

function howSweepsWork() {
  openModal({
    title: 'How a sweep works', wide: true,
    body: `<p class="muted">Cheap, exact steps run first, so the AI only reads what's left.</p>
      <ol class="sw-arch">
        <li><span>${icon('clock', 14)}</span><div><strong>On schedule</strong><span>Your schedule (stored as cron, in Sydney time) starts a run.</span></div></li>
        <li><span>${icon('radar', 14)}</span><div><strong>Search each site</strong><span>One worker per site, at a polite pace. It obeys robots.txt and backs off when a site says slow down.</span></div></li>
        <li><span>${icon('layers', 14)}</span><div><strong>Merge duplicates</strong><span>The same job posted on several sites becomes one.</span></div></li>
        <li><span>${icon('filter', 14)}</span><div><strong>Apply your rules</strong><span>Salary floor, location, work rights and your never-show list. Exact and free.</span></div></li>
        <li><span>${icon('search', 14)}</span><div><strong>Compare meaning</strong><span>Jobs far from your profile in meaning are dropped, even if they share keywords.</span></div></li>
        <li><span>${icon('spark', 14)}</span><div><strong>AI judge</strong><span>${esc(JUDGE_MODEL)} reads each remaining ad against your own words and gives a score and a reason.</span></div></li>
        <li><span>${icon('zap', 14)}</span><div><strong>Matches, and auto-tailor</strong><span>Kept jobs land in Matches. If auto-tailor is on, high scorers get a resume made straight away.</span></div></li>
      </ol>`,
    actions: [{ label: 'Got it', kind: 'btn-primary' }],
  });
}

function editScheduleModal(s, done) {
  const sched = clone(s.schedule);
  let destroy = null;
  openModal({
    title: 'Schedule: ' + s.name, wide: true,
    body: schedulerHtml(sched),
    actions: [{ label: 'Cancel', fn: () => { destroy && destroy(); } }, { label: 'Save schedule', kind: 'btn-primary', fn: () => { destroy && destroy(); s.schedule = { text: sched.text, crons: sched.crons }; Store.save(); done(); toast('Schedule saved. ' + Cron.human(sched.crons[0]) + (sched.crons.length > 1 ? ' and more' : '')); } }],
    onMount(m) { destroy = bindScheduler(m, sched, { name: s.name, color: sweepColor(s.id) }); },
  });
}

function autoTailorHtml(a) {
  return `<div class="sw-auto-form">
    <label class="switch-row"><input type="checkbox" data-auto-on ${a.on ? 'checked' : ''}><span><strong>Tailor strong matches automatically</strong><br><span class="muted small">When the AI judge scores a job at or above the threshold, the sweep starts the resume pipeline for you.</span></span></label>
    <div class="form-grid" data-auto-opts ${a.on ? '' : 'hidden'}>
      <div class="field"><label for="auto-th">Threshold</label><select id="auto-th" data-auto-th>${[80, 85, 90, 95].map((t) => `<option value="${t}" ${a.threshold === t ? 'selected' : ''}>Score ${t} or more</option>`).join('')}</select></div>
      <div class="field"><label for="auto-mode">What it makes</label><select id="auto-mode" data-auto-mode><option value="quick" ${a.mode === 'quick' ? 'selected' : ''}>Finished PDFs (Quick generate)</option><option value="studio" ${a.mode === 'studio' ? 'selected' : ''}>A draft for me to edit (Studio)</option></select></div>
    </div>
    <p class="muted small">Nothing is ever sent to an employer. You still review and apply yourself.</p>
  </div>`;
}
function readAutoTailor(root, a) {
  a.on = $('[data-auto-on]', root).checked;
  a.threshold = +$('[data-auto-th]', root).value;
  a.mode = $('[data-auto-mode]', root).value;
}
function bindAutoTailor(root) { const cb = $('[data-auto-on]', root); cb.onchange = () => ($('[data-auto-opts]', root).hidden = !cb.checked); }

function editAutoModal(s, done) {
  openModal({
    title: 'Auto-tailor: ' + s.name,
    body: autoTailorHtml(s.autoTailor),
    actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'btn-primary', fn: (m) => { readAutoTailor(m, s.autoTailor); Store.save(); done(); toast('Auto-tailor ' + (s.autoTailor.on ? 'on' : 'off')); } }],
    onMount: bindAutoTailor,
  });
}

/* ---------- Search profile + preferences form (wizard step and Edit profile modal) ---------- */
function prefsFormHtml(p) {
  return `
  <div class="form-grid">
    <div class="field field-wide"><label for="pf-titles">Job titles <span class="optional">separated by commas</span></label><input id="pf-titles" data-pf="titles" value="${esc(p.titles.join(', '))}"></div>
    <div class="field"><label for="pf-loc">Locations</label><input id="pf-loc" data-pf="locations" value="${esc(p.locations.join(', '))}"></div>
    <div class="field"><span class="instr-label">Work type</span><div class="pf-checks">${['On-site', 'Hybrid', 'Remote'].map((w) => `<label><input type="checkbox" data-pf-wt value="${w}" ${p.workTypes.includes(w) ? 'checked' : ''}> ${w}</label>`).join('')}</div></div>
    <div class="field field-wide"><label for="pf-sal">Salary floor, base <output data-pf-salout>${money(p.salaryFloor)}</output></label><input id="pf-sal" type="range" min="80000" max="260000" step="5000" value="${p.salaryFloor}" data-pf-sal></div>
    <div class="field field-wide"><label for="pf-avoid">Never show me <span class="optional">industries, employers or terms, separated by commas</span></label><input id="pf-avoid" data-pf="avoid" value="${esc(p.avoid.join(', '))}"></div>
  </div>`;
}
function readPrefs(root, p) {
  const list = (k) => $(`[data-pf="${k}"]`, root).value.split(',').map((x) => x.trim()).filter(Boolean);
  p.titles = list('titles'); p.locations = list('locations'); p.avoid = list('avoid');
  p.workTypes = $$('[data-pf-wt]', root).filter((c) => c.checked).map((c) => c.value);
  p.salaryFloor = +$('[data-pf-sal]', root).value;
}
function bindPrefs(root) { const s = $('[data-pf-sal]', root); s.oninput = () => ($('[data-pf-salout]', root).textContent = money(+s.value)); }

function editProfileModal(done) {
  const r = jobsState();
  openModal({
    title: 'Search profile', wide: true,
    body: `${prefsFormHtml(r.profile)}<div class="field pf-ideal"><label for="pf-ideal2">Your ideal job, in your own words <span class="optional">the AI judge reads this</span></label><textarea id="pf-ideal2" rows="3" data-pf-ideal>${esc(r.profile.ideal)}</textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save profile', kind: 'btn-primary', fn: (m) => { readPrefs(m, r.profile); r.profile.ideal = $('[data-pf-ideal]', m).value.trim(); Store.save(); done(); toast('Search profile saved. The next run uses it.'); } }],
    onMount: bindPrefs,
  });
}

// The mock "rubric" the AI judge would derive from the user's own words
function buildRubric(text, p) {
  const t = text.toLowerCase();
  const must = [], prefer = [], reject = [];
  const kws = ['React', 'TypeScript', 'Node', 'AWS', 'Performance', 'Design system', 'Mentoring', 'Accessibility', 'GraphQL', 'Testing'];
  kws.forEach((k) => { if (t.includes(k.toLowerCase())) (['react', 'typescript'].includes(k.toLowerCase()) ? must : prefer).push(k); });
  if (/product compan/.test(t)) must.push('Product company (not consulting)');
  if (/engineering culture/.test(t)) prefer.push('Signs of engineering culture (tech blog, open source, testing)');
  if (/no agenc|not agenc/.test(t)) reject.push('Recruitment agency listings');
  if (/remote/.test(t)) prefer.push('Remote or hybrid');
  p.avoid.forEach((a) => reject.push(a));
  if (/lead|senior/.test(t) || p.titles.some((x) => /senior|lead/i.test(x))) must.push('Senior or Lead level, hands-on');
  if (!must.length) must.push(...p.titles.slice(0, 2));
  return { must: [...new Set(must)], prefer: [...new Set(prefer)], reject: [...new Set(reject)] };
}

/* ---------- New sweep wizard ---------- */
function sweepWizard(root) {
  const r = jobsState();
  if (!r.draft) r.draft = { step: 0, name: '', platforms: ['seek', 'linkedin', 'indeed'], sessions: { seek: false, indeed: false }, companies: ['Brushstroke', 'Quokka Pay', 'Tidal Grid'], profileMode: r.profile.mode, sepProfile: { label: 'Search bot', titles: '', location: '' }, prefs: clone(r.profile), rubric: null, strictness: 75, schedule: { text: 'Every weekday at 7am', crons: ['0 7 * * 1-5'] }, autoTailor: { on: true, threshold: 90, mode: 'quick' } };
  const d = r.draft;
  let destroySched = null;
  const STEPS = ['Sources', 'Search profile', 'Filters', 'Schedule', 'Review'];

  function frame(inner, foot) {
    if (destroySched) { destroySched(); destroySched = null; }
    root.innerHTML = shell(`
      <div class="wz-wrap">
        <ol class="stepper">${STEPS.map((l, i) => `<li class="${i === d.step ? 'current' : ''} ${i < d.step ? 'done' : ''}"><span class="step-num">${i < d.step ? icon('check', 12) : i + 1}</span>${l}</li>`).join('')}</ol>
        <section class="panel wz-panel">${inner}</section>
        <div class="wz-foot">
          ${d.step ? `<button class="btn btn-ghost" data-back>${icon('chevLeft', 15)} Back</button>` : `<a class="btn btn-ghost" href="#/jobs/sweeps">Cancel</a>`}
          <span class="muted small">Step ${d.step + 1} of ${STEPS.length}</span>
          ${foot || `<button class="btn btn-primary" data-next>Continue ${icon('chevRight', 15)}</button>`}
        </div>
      </div>`, { route: 'jobs', title: `<a class="crumb" href="#/jobs/sweeps">${icon('chevLeft', 15)} Sweeps</a><span class="crumb-sep">/</span><span>New sweep</span>` });
    bindShell(root);
    const back = $('[data-back]', root);
    if (back) back.onclick = () => { save(); d.step--; Store.save(); draw(); };
    const next = $('[data-next]', root);
    if (next) next.onclick = () => { if (save() === false) return; d.step++; Store.save(); draw(); };
  }
  let save = () => {};

  function stepSources() {
    frame(`
      <h1>Where should it look?</h1>
      <p class="muted">Pick the job sites to sweep. Each one runs in its own worker, at a polite pace.</p>
      <div class="pf-grid">${JOBS_MOCK.platforms.map((p) => {
        const on = d.platforms.includes(p.id);
        return `<button type="button" class="pf-card ${on ? 'on' : ''}" aria-pressed="${on}" data-pf-toggle="${p.id}">
          <span class="pf-card-top">${platformBadge(p.id)}<strong>${esc(p.name)}</strong><span class="pf-check">${on ? icon('check', 13) : ''}</span></span>
          <span class="pf-method">${esc(p.method)}</span>
          <span class="muted small">${esc(p.note)}</span>
          <span class="pf-rate">${icon('clock', 12)} ${esc(p.rate)}</span>
        </button>`;
      }).join('')}</div>
      ${d.platforms.includes('linkedin') ? `<div class="callout">${icon('shield', 16)}<div><strong>About LinkedIn.</strong> LinkedIn's terms don't allow automated scraping, so this source never logs in as you or crawls the site. It reads the job alert emails LinkedIn already sends you, from a mail folder you connect. <a href="#" data-mock-link>Connect alert emails</a></div></div>` : ''}
      ${d.platforms.some((x) => ['seek', 'indeed'].includes(x)) ? `
      <div class="wz-sub">
        <h3>Signed-in sessions <span class="optional">optional</span></h3>
        <p class="muted small">Signed in, the crawler also sees roles recommended to you. The session is encrypted and stays on this device.</p>
        ${['seek', 'indeed'].filter((x) => d.platforms.includes(x)).map((x) => `<label class="toggle wz-session"><input type="checkbox" data-session="${x}" ${d.sessions[x] ? 'checked' : ''}><span class="toggle-track"></span><span class="toggle-text">${platformBadge(x)} Use my ${esc(platformOf(x).name)} session</span></label>`).join('')}
      </div>` : ''}
      ${d.platforms.includes('workable') ? `
      <div class="wz-sub">
        <h3>Companies to watch</h3>
        <p class="muted small">Checks each company's careers board (Greenhouse, Lever or Workable) every run.</p>
        <div class="chips" data-cos>${d.companies.map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-co-rm="${i}" aria-label="Remove ${esc(c)}">${icon('x', 11)}</button></span>`).join('')}</div>
        <div class="input-row wz-co-add"><input data-co-in placeholder="Add a company, e.g. Atlassian" aria-label="Company name"><button type="button" class="btn btn-ghost" data-co-add>Add</button></div>
      </div>` : ''}
      <div class="field-error" data-err hidden></div>`);
    $$('[data-pf-toggle]', root).forEach((b) => (b.onclick = () => { const id = b.dataset.pfToggle; d.platforms = d.platforms.includes(id) ? d.platforms.filter((x) => x !== id) : [...d.platforms, id]; Store.save(); stepSources(); }));
    $$('[data-session]', root).forEach((c) => (c.onchange = () => { d.sessions[c.dataset.session] = c.checked; Store.save(); if (c.checked) toast(`A ${platformOf(c.dataset.session).name} sign-in window would open here (mock)`); }));
    $$('[data-mock-link]', root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); toast('Would connect a mail folder with LinkedIn alert emails (mock)'); }));
    $$('[data-co-rm]', root).forEach((b) => (b.onclick = () => { d.companies.splice(+b.dataset.coRm, 1); stepSources(); }));
    const add = $('[data-co-add]', root);
    if (add) {
      const go = () => { const v = $('[data-co-in]', root).value.trim(); if (v) { d.companies.push(v); stepSources(); $('[data-co-in]', root).focus(); } };
      add.onclick = go;
      $('[data-co-in]', root).onkeydown = (e) => { if (e.key === 'Enter') go(); };
    }
    save = () => { if (!d.platforms.length) { const e = $('[data-err]', root); e.hidden = false; e.textContent = 'Choose at least one job site.'; return false; } };
  }

  function stepProfile() {
    const kb = Store.state.kb;
    const titles = [...new Set(kb.roles.map((x) => x.title))];
    const skills = kb.skills.flatMap((g) => g.items).slice(0, 8);
    frame(`
      <h1>Who's searching?</h1>
      <p class="muted">The bot searches and judges jobs as someone. Use your own knowledge base, or give it a separate profile.</p>
      <div class="choice-grid wz-choice">
        <button type="button" class="choice ${d.profileMode === 'kb' ? 'choice-primary' : ''}" data-pmode="kb" aria-pressed="${d.profileMode === 'kb'}">
          <span class="choice-top"><span class="choice-ic">${icon('book', 20)}</span>${d.profileMode === 'kb' ? '<span class="pill pill-ok">Selected</span>' : ''}</span>
          <h2>Use my knowledge base</h2>
          <p>Jobs are matched against the experience you've already entered. Best when you're looking for more of what you do.</p>
          <dl class="wz-kb">
            <dt>Name</dt><dd>${esc(kb.contact.name)}</dd>
            <dt>Titles</dt><dd>${esc(titles.join(', '))}</dd>
            <dt>Top skills</dt><dd>${esc(skills.join(', '))}</dd>
            <dt>Work rights</dt><dd>${esc(kb.workRights.status)}</dd>
          </dl>
        </button>
        <button type="button" class="choice ${d.profileMode === 'separate' ? 'choice-primary' : ''}" data-pmode="separate" aria-pressed="${d.profileMode === 'separate'}">
          <span class="choice-top"><span class="choice-ic">${icon('bot', 20)}</span>${d.profileMode === 'separate' ? '<span class="pill pill-ok">Selected</span>' : ''}</span>
          <h2>A separate search profile</h2>
          <p>A profile just for the bot. Useful when you're searching for a different kind of role than your resume shows, or want it kept apart.</p>
        </button>
      </div>
      ${d.profileMode === 'separate' ? `
      <div class="wz-sub form-grid">
        <div class="field"><label for="sp-label">Profile name</label><input id="sp-label" data-sp="label" value="${esc(d.sepProfile.label)}"></div>
        <div class="field"><label for="sp-rights">Work rights</label><select id="sp-rights" data-sp="rights">${KB_SCHEMA.workRights.fields[0].options.map((o) => `<option ${o === (d.sepProfile.rights || kb.workRights.status) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <div class="field field-wide"><label for="sp-sum">What you'd bring <span class="optional">a few lines; the semantic match compares jobs with this</span></label><textarea id="sp-sum" rows="3" data-sp="summary" placeholder="e.g. 7 years in frontend, moving into developer relations. Strong writer, run meetups, React and TypeScript.">${esc(d.sepProfile.summary || '')}</textarea></div>
      </div>` : ''}`);
    $$('[data-pmode]', root).forEach((b) => (b.onclick = () => { save(); d.profileMode = b.dataset.pmode; Store.save(); stepProfile(); }));
    save = () => { $$('[data-sp]', root).forEach((el) => (d.sepProfile[el.dataset.sp] = el.value)); };
  }

  function stepFilters() {
    const rub = d.rubric;
    frame(`
      <h1>What are you looking for?</h1>
      <p class="muted">Two layers. Exact rules throw out the obvious misses for free. The AI judge reads what's left, the way you would.</p>
      <ol class="wz-flow" aria-label="Filtration steps">
        <li data-tip="Every listing on the sites you picked"><strong>Search</strong><span>every listing</span></li><li data-tip="The same job posted on several sites becomes one"><strong>Merge</strong><span>duplicates</span></li><li class="on" data-tip="Exact checks you set on the left. Free and instant."><strong>Rules</strong><span>set here</span></li><li data-tip="Drops jobs far from your profile in meaning, even if keywords match"><strong>Meaning</strong><span>automatic</span></li><li class="on" data-tip="${esc(JOB_TIPS.judge)}"><strong>AI judge</strong><span>set here</span></li>
      </ol>
      <div class="wz-cols">
        <div>
          <h3 class="wz-h">${icon('filter', 15)} Rules</h3>
          ${prefsFormHtml(d.prefs)}
        </div>
        <div>
          <h3 class="wz-h">${icon('spark', 15)} AI judge</h3>
          <div class="field"><label for="wz-ideal">Describe your ideal job in your own words</label><textarea id="wz-ideal" rows="5" data-ideal>${esc(d.prefs.ideal)}</textarea></div>
          <button type="button" class="btn btn-ghost btn-sm wz-rubric-btn" data-rubric>${icon('spark', 14)} ${rub ? 'Rebuild' : 'Build'} the judge's rubric</button>
          <div data-rubric-out>${rub ? rubricHtml(rub) : '<p class="muted small">The judge turns your words into a checklist it scores every job against. Build it to check it understood you.</p>'}</div>
          <div class="field wz-strict"><label for="wz-strict">Keep jobs scoring <output data-strict-out>${d.strictness}</output> or more</label><input id="wz-strict" type="range" min="50" max="95" step="5" value="${d.strictness}" data-strict>
            <span class="muted small" data-strict-note>${strictNote(d.strictness)}</span></div>
        </div>
      </div>`);
    bindPrefs(root);
    const strict = $('[data-strict]', root);
    strict.oninput = () => { d.strictness = +strict.value; $('[data-strict-out]', root).textContent = strict.value; $('[data-strict-note]', root).textContent = strictNote(d.strictness); };
    $('[data-rubric]', root).onclick = async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Reading what you wrote…';
      save();
      await sleep(reducedMotion() ? 0 : 900);
      if (!btn.isConnected) return;
      d.rubric = buildRubric(d.prefs.ideal, d.prefs);
      Store.save();
      stepFilters();
    };
    bindRubricRemove();
    save = () => { readPrefs(root, d.prefs); d.prefs.ideal = $('[data-ideal]', root).value.trim(); };
  }
  function rubricHtml(rub) {
    const grp = (k, label, cls) => `<div class="rb-row"><span class="rb-label">${label}</span><div class="chips">${rub[k].map((x, i) => `<span class="chip ${cls}">${esc(x)}<button type="button" data-rb="${k}:${i}" aria-label="Remove ${esc(x)}">${icon('x', 11)}</button></span>`).join('') || '<span class="muted small">None</span>'}</div></div>`;
    return `<div class="rb">${grp('must', 'Must have', 'chip-ok')}${grp('prefer', 'Nice to have', '')}${grp('reject', 'Reject if', 'chip-bad')}</div>`;
  }
  function bindRubricRemove() {
    $$('[data-rb]', root).forEach((b) => (b.onclick = () => { const [k, i] = b.dataset.rb.split(':'); d.rubric[k].splice(+i, 1); Store.save(); $('[data-rubric-out]', root).innerHTML = rubricHtml(d.rubric); bindRubricRemove(); }));
  }
  function strictNote(v) {
    const perDay = Math.max(1, Math.round(28 * Math.exp(-(v - 50) / 14)));
    return `About ${perDay} ${perDay === 1 ? 'job' : 'jobs'} a day from your sites at this level. ${v >= 85 ? 'Very picky.' : v <= 60 ? 'Expect some noise.' : ''}`;
  }

  function stepSchedule() {
    frame(`
      <h1>When should it run?</h1>
      <p class="muted">Type it the way you'd say it. The schedule is turned into cron expressions you can check, or edit by hand.</p>
      ${schedulerHtml(d.schedule)}
      <div class="wz-sub"><h3>After each run</h3>${autoTailorHtml(d.autoTailor)}</div>`);
    destroySched = bindScheduler(root, d.schedule, { name: 'New sweep', color: SWEEP_COLORS[r.sweeps.length % SWEEP_COLORS.length], onChange: () => Store.save() });
    bindAutoTailor(root);
    save = () => { readAutoTailor(root, d.autoTailor); };
  }

  function stepReview() {
    if (!d.name) d.name = (d.prefs.titles[0] || 'New sweep').replace(/^Senior /, '') + ' · ' + (d.prefs.locations[0] || 'Australia').split(' ')[0];
    const est = d.platforms.length * 95;
    frame(`
      <h1>Ready to sweep</h1>
      <div class="field wz-name"><label for="wz-name">Sweep name</label><input id="wz-name" data-name value="${esc(d.name)}"></div>
      <dl class="wz-review">
        <dt>Sources</dt><dd>${d.platforms.map((id) => `<span class="sw-pf">${platformBadge(id)} ${esc(platformOf(id).name)}</span>`).join('')}</dd>
        <dt>Searching as</dt><dd>${d.profileMode === 'kb' ? 'Your knowledge base' : esc(d.sepProfile.label || 'Separate profile')}</dd>
        <dt>Rules</dt><dd>${esc(d.prefs.titles.join(', '))}<br><span class="muted">${esc(d.prefs.locations.join(', '))} · ${esc(d.prefs.workTypes.join(', '))} · ${money(d.prefs.salaryFloor)}+ · never ${esc(d.prefs.avoid.join(', ').toLowerCase())}</span></dd>
        <dt>AI judge</dt><dd>Keeps jobs scoring ${d.strictness}+${d.rubric ? `, rubric with ${d.rubric.must.length + d.rubric.prefer.length + d.rubric.reject.length} checks` : ''}</dd>
        <dt>Schedule</dt><dd>${esc(cronsHuman(d.schedule.crons))} <span class="sw-crons">${d.schedule.crons.map((c) => `<code>${esc(c)}</code>`).join('')}</span></dd>
        <dt>Auto-tailor</dt><dd>${d.autoTailor.on ? `Jobs scoring ${d.autoTailor.threshold}+ go straight to ${d.autoTailor.mode === 'quick' ? 'Quick generate' : 'a Studio draft'}` : 'Off'}</dd>
      </dl>
      <div class="callout">${icon('spark', 16)}<div><strong>Estimated per run:</strong> about ${est} listings crawled, ${Math.round(est * 0.09)} reach the AI judge, roughly ${Math.round(est * 0.09 * 1.4)}k tokens on your own ${esc(JUDGE_MODEL)} key. Judged listings are cached, so repeats cost nothing.</div></div>`,
      `<div class="row-gap"><button class="btn btn-ghost" data-save-only>Save</button><button class="btn btn-primary" data-launch>${icon('play', 14)} Save and run now</button></div>`);
    const create = () => {
      d.name = $('[data-name]', root).value.trim() || d.name;
      const s = { id: uid('sw'), name: d.name, platforms: d.platforms.slice(), query: d.prefs.titles.join(', '), schedule: { text: d.schedule.text, crons: d.schedule.crons.slice() }, active: true, autoTailor: clone(d.autoTailor), lastFunnel: null };
      r.sweeps.push(s);
      r.profile = { ...clone(d.prefs), mode: d.profileMode, label: d.sepProfile.label || r.profile.label };
      r.draft = null;
      Store.saveNow();
      return s;
    };
    $('[data-save-only]', root).onclick = () => { create(); location.hash = '#/jobs/sweeps'; toast('Sweep saved and scheduled'); };
    $('[data-launch]', root).onclick = () => { const s = create(); location.hash = '#/jobs/run/' + s.id; };
    save = () => { d.name = $('[data-name]', root).value.trim() || d.name; };
  }

  function draw() { [stepSources, stepProfile, stepFilters, stepSchedule, stepReview][d.step](); }
  draw();
  return () => { if (destroySched) destroySched(); };
}

/* ---------- Live sweep run ---------- */
function sweepRunView(root, id) {
  const r = jobsState();
  const s = r.sweeps.find((x) => x.id === id) || r.sweeps[0];
  if (!s) { location.hash = '#/jobs/sweeps'; return; }
  const runNo = ++r.runSeq;
  let alive = true, chart = null;
  let cancelled = false; // only the Cancel button sets this; leaving the page lets the run finish in the background
  const t0 = performance.now();
  const base = s.lastFunnel || (() => { const c = s.platforms.length * 90 + 37; return { crawled: c, deduped: Math.round(c * 0.68), hard: Math.round(c * 0.24), semantic: Math.round(c * 0.08), llm: Math.max(2, Math.round(c * 0.022)) }; })();
  const f = { crawled: base.crawled + 7, deduped: base.deduped + 4, hard: base.hard + 2, semantic: base.semantic + 1, llm: base.llm + (r.freshAdded ? 0 : 2) };
  const stages = [
    { label: 'Crawled', short: 'Crawled', value: f.crawled, how: s.platforms.map((p) => platformOf(p).name).join(', ') },
    { label: 'Unique', short: 'Unique', value: f.deduped, dropLabel: 'duplicates', how: 'SimHash on title and body, plus canonical URLs', reasons: ['Same job posted on several sites', 'Reposts of last week\'s listings'] },
    { label: 'Passed rules', short: 'Rules', value: f.hard, dropLabel: 'rules', how: 'Salary floor, location, work rights, avoid list', reasons: [`Salary under ${money(r.profile.salaryFloor)}: ${Math.round((f.deduped - f.hard) * 0.5)}`, `Location: ${Math.round((f.deduped - f.hard) * 0.27)}`, `Avoid list: ${Math.round((f.deduped - f.hard) * 0.15)}`, `Contracts under 6 months: ${Math.round((f.deduped - f.hard) * 0.08)}`] },
    { label: 'Semantic match', short: 'Semantic', value: f.semantic, dropLabel: 'off-target', how: 'Cosine similarity with your profile of 0.72 or more', reasons: ['Backend-only roles (Java, .NET)', 'Data and ML roles', 'Non-engineering titles that matched keywords'] },
    { label: 'Kept by AI judge', short: 'AI kept', value: f.llm, dropLabel: 'judged out', how: `${JUDGE_MODEL} with your rubric, keeps scores of ${75}+`, reasons: ['People-management roles', 'Avoid-list industries mentioned only in the body', 'Seniority too junior'] },
  ];
  const workers = s.platforms.map((p, i) => ({ id: p, pages: 6 + ((i * 5) % 7), done: 0, found: 0, state: 'queued' }));

  root.innerHTML = shell(`
    <div class="run-head">
      <div>
        <div class="muted small"><code>run #${runNo}</code> · triggered manually · Australia/Sydney</div>
        <h1 data-run-title><span class="run-live"></span> Sweeping: ${esc(s.name)}</h1>
      </div>
      <div class="row-gap"><span class="muted small run-elapsed" data-elapsed>0.0s</span><button class="btn btn-ghost btn-sm" data-cancel>Cancel run</button></div>
    </div>
    <section class="panel run-funnel">
      <div class="panel-head"><div><h2>Filtration funnel</h2><p class="muted small">Hover a column or a drop-off to see what happened there.</p></div></div>
      <div data-funnel></div>
    </section>
    <div class="run-grid">
      <section class="panel">
        <h2>Crawler workers</h2>
        <ul class="run-workers">${workers.map((w) => `<li data-w="${w.id}">${platformBadge(w.id)}<div class="run-w-main"><div class="run-w-top"><strong>${esc(platformOf(w.id).name)}</strong><span class="muted small" data-w-note>Queued</span></div><div class="bar"><div class="bar-fill" data-w-fill style="width:0%"></div></div></div><span class="run-w-n" data-w-n>0</span></li>`).join('')}</ul>
        <div data-result></div>
      </section>
      <section class="panel run-log-panel">
        <div class="run-log-head"><h2>Log</h2><span class="muted small">stdout · ${esc(s.id)}</span></div>
        <pre class="run-log" data-log aria-live="off"></pre>
      </section>
    </div>
  `, { route: 'jobs', title: `<a class="crumb" href="#/jobs/sweeps">${icon('chevLeft', 15)} Sweeps</a><span class="crumb-sep">/</span><span>Run #${runNo}</span>` });
  bindShell(root);
  chart = Viz.funnel($('[data-funnel]', root), stages, { revealed: 0 });
  const logEl = $('[data-log]', root);
  const timer = setInterval(() => { const e = $('[data-elapsed]', root); if (e) e.textContent = ((performance.now() - t0) / 1000).toFixed(1) + 's'; }, 100);
  const ts = () => { const x = ((performance.now() - t0) / 1000).toFixed(2).padStart(6, ' '); return x; };
  function log(tag, msg, kind = '') {
    if (!alive) return;
    const line = document.createElement('span');
    line.className = 'log-line ' + (kind ? 'log-' + kind : '');
    line.innerHTML = `<span class="log-t">${ts()}</span> <span class="log-tag">[${esc(tag)}]</span> ${esc(msg)}\n`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }
  const W = (id) => $(`[data-w="${id}"]`, root);
  const pace = (ms) => sleep(reducedMotion() ? Math.min(ms, 40) : ms);

  $('[data-cancel]', root).onclick = () => { cancelled = true; alive = false; clearInterval(timer); toast('Run cancelled. Nothing was added to Matches.'); location.hash = '#/jobs/sweeps'; };

  (async () => {
    log('scheduler', `run #${runNo} queued for "${s.name}" (${s.platforms.length} sources)`);
    await pace(350);
    log('queue', `${workers.length} crawl jobs enqueued, concurrency 2, retry with exponential backoff`);
    await pace(300);
    // crawl: two workers at a time
    const per = workers.map((w, i) => Math.round((f.crawled / workers.length) * (0.8 + ((i * 37) % 40) / 100)));
    const scale = f.crawled / per.reduce((a, b) => a + b, 0);
    const counts = per.map((x) => Math.round(x * scale));
    counts[counts.length - 1] += f.crawled - counts.reduce((a, b) => a + b, 0);
    async function crawl(w, total) {
      const p = platformOf(w.id);
      const el = W(w.id);
      w.state = 'running';
      if (el) { el.classList.add('on'); $('[data-w-note]', el).textContent = 'Starting'; }
      if (w.id === 'linkedin') log(w.id, 'reading job alert emails from the connected mail folder (no crawling)');
      else if (w.id === 'apsjobs') log(w.id, 'GET RSS feed');
      else if (w.id === 'workable') log(w.id, 'polling Greenhouse, Lever and Workable boards for watched companies');
      else log(w.id, `headless Chromium up · robots.txt ok · ${p.rate}`);
      for (let pg = 1; pg <= w.pages; pg++) {
        if (!alive) return;
        await pace(170 + Math.random() * 160);
        const add = pg === w.pages ? total - w.found : Math.round(total / w.pages);
        w.found += add;
        if (el && el.isConnected) {
          $('[data-w-fill]', el).style.width = (pg / w.pages) * 100 + '%';
          $('[data-w-note]', el).textContent = w.id === 'linkedin' ? `email ${pg} of ${w.pages}` : `page ${pg} of ${w.pages}`;
          $('[data-w-n]', el).textContent = w.found;
        }
        if (pg === 3 && w.id === 'seek') {
          log(w.id, '429 Too Many Requests · backing off 8s (attempt 1 of 5)', 'warn');
          if (el) $('[data-w-note]', el).textContent = 'Rate limited, backing off';
          await pace(900);
          log(w.id, 'resumed');
        }
        if (pg % 3 === 0 || pg === w.pages) log(w.id, `${w.id === 'linkedin' ? 'email' : 'page'} ${pg}/${w.pages} · ${w.found} listings`);
      }
      w.state = 'done';
      if (el && el.isConnected) { el.classList.remove('on'); el.classList.add('done'); $('[data-w-note]', el).textContent = 'Done'; }
    }
    const queue = workers.map((w, i) => () => crawl(w, counts[i]));
    const lanesRun = [queue.shift(), queue.shift()].filter(Boolean).map(async (first) => { await first(); while (queue.length && alive) await queue.shift()(); });
    await Promise.all(lanesRun);
    if (cancelled) return;
    chart.update({ revealed: 1 });
    log('normalise', `mapped ${f.crawled} listings to the JobPosting schema · ${Math.round(f.crawled * 0.3)} had no salary, estimated from title and location`);
    await pace(700);
    chart.update({ revealed: 2 });
    log('dedupe', `SimHash + canonical URLs merged ${f.crawled - f.deduped} duplicates → ${f.deduped} unique`);
    await pace(800);
    chart.update({ revealed: 3 });
    stages[2].reasons.forEach((x) => log('rules', 'removed ' + x.toLowerCase().replace(/: /, ': −')));
    log('rules', `${f.hard} passed`);
    await pace(900);
    chart.update({ revealed: 4 });
    log('embed', `embedded ${f.hard} listings, compared with your profile (cosine ≥ 0.72) → ${f.semantic} passed`);
    await pace(700);
    log('judge', `${JUDGE_MODEL} · rubric v3 · scoring ${f.semantic} listings in batches of 8 · structured JSON output`);
    const fresh = r.freshAdded ? [] : clone(JOBS_MOCK.freshJobs);
    const shown = [...fresh, ...r.jobs.filter((j) => j.sweep === s.id || s.platforms.includes(j.platform))].slice(0, 5);
    for (const j of shown) {
      await pace(380);
      log('judge', `${j.score} keep · ${j.company}, ${j.title} · "${j.reason.split('. ')[0]}"`, 'ok');
    }
    await pace(300);
    log('check', 'listing check on kept jobs: copies across sites, careers pages, hiring record, layoffs news, scam wording');
    await pace(350);
    log('check', 'Linehaul: likely fake (up 148 days, reposted 11 times, 13% layoffs) · Nimbus Digital Group: likely fake (scam signs)', 'warn');
    await pace(300);
    log('judge', `${f.semantic - f.llm} judged out (people-management, wrong seniority, avoid-list terms in the body)`);
    chart.update({ revealed: 5 });
    if (cancelled) return;
    // add fresh jobs on the first run
    if (!r.freshAdded) {
      const now = Date.now();
      fresh.forEach((j) => { j.foundAt = now - j.hoursAgo * 3600e3; j.sweep = s.id; r.jobs.unshift(j); });
      r.freshAdded = true;
    }
    // auto-tailor
    let auto = null;
    if (s.autoTailor.on) {
      const cand = r.jobs.filter((j) => j.status === 'new' && !j.projectId && j.score >= s.autoTailor.threshold).sort((a, b) => b.score - a.score)[0];
      if (cand && Store.state.connections[Store.state.activeModel.provider]) {
        log('pipeline', `auto-tailor: ${cand.company} scored ${cand.score} (≥ ${s.autoTailor.threshold}) → ${s.autoTailor.mode === 'quick' ? 'Quick generate' : 'Studio draft'}`);
        await pace(900);
        if (cancelled) return;
        auto = { job: cand, project: makeProjectForJob(cand) };
        log('pipeline', `${cand.company}: resume and cover letter ready (project ${auto.project.id})`, 'ok');
      } else log('pipeline', `auto-tailor: no new job scored ${s.autoTailor.threshold}+ this run`);
    }
    if (cancelled) return;
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    log('done', `${f.llm} kept · ${fresh.length} new since last run · ${secs}s · ~${Math.round(f.semantic * 1.7)}k tokens`, 'ok');
    clearInterval(timer);
    s.lastFunnel = { crawled: f.crawled, deduped: f.deduped, hard: f.hard, semantic: f.semantic, llm: f.llm };
    r.runs.unshift({ id: 'run-' + runNo, at: Date.now(), sweep: s.id, kept: f.llm, crawled: f.crawled, status: 'ok', secs: Math.round(+secs), note: '' });
    Store.saveNow();
    if (!alive) return;
    $('[data-run-title]', root).innerHTML = `${icon('check', 20)} Sweep finished: ${esc(s.name)}`;
    $('[data-cancel]', root).remove();
    const top = r.jobs.filter((j) => j.status === 'new').sort((a, b) => b.score - a.score).slice(0, 3);
    $('[data-result]', root).innerHTML = `
      <div class="run-result">
        <h3>${f.llm} jobs kept${fresh.length ? `, ${fresh.length} new since the last run` : ''}</h3>
        ${auto ? `<div class="callout">${icon('zap', 16)}<div><strong>Auto-tailored ${esc(auto.job.company)}</strong> (score ${auto.job.score}). It's in your applications as a draft, ready to review. <a href="#/project/${auto.project.id}">Open application</a></div></div>` : ''}
        <ul class="run-top">${top.map((j) => `<li>${scoreRing(j.score, 'sm')}<div><strong>${esc(j.title)}</strong><div class="muted small">${esc(j.company)} · ${esc(j.location)}</div></div><button class="btn btn-sm btn-ghost" data-open-job="${j.id}">View</button></li>`).join('')}</ul>
        <div class="row-gap"><a class="btn btn-primary" href="#/jobs">Review matches ${icon('chevRight', 14)}</a><a class="btn btn-ghost" href="#/map">See it on your career map</a></div>
      </div>`;
    $$('[data-open-job]', root).forEach((b) => (b.onclick = () => { r.ui.selected = b.dataset.openJob; r.ui.filter = 'all'; Store.save(); location.hash = '#/jobs'; }));
  })();

  return () => { alive = false; clearInterval(timer); if (chart) chart.destroy(); };
}

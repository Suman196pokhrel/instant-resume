/* Documents: generation from the KB, rendering (stand-in for Typst), checks (rules engine) and the mock LLM. */

const Docs = (function () {
  const norm = (s) => String(s || '').toLowerCase();
  // Split on commas that aren't inside parentheses, e.g. "AWS (Lambda, ECS, SQS)"
  const splitSkills = (line) => line.split(/,(?![^()]*\))/).map((x) => x.trim()).filter(Boolean);
  // Lowercase the first word only when it's a plain English word, not a tech term or acronym ("AWS", "React", "Go")
  const lowerFirst = (s) => {
    const first = s.split(/[\s,]/)[0];
    const terms = TECH_TERMS.concat(kbSkillList(MOCK.kb)).map(norm);
    if (!/^[A-Z][a-z]+$/.test(first) || terms.some((t) => t === norm(first) || t.startsWith(norm(first) + ' ') || t.startsWith(norm(first) + '.'))) return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  };
  const RIGHTS_PHRASE = {
    'Australian citizen': "I'm an Australian citizen",
    'Permanent resident': "I'm a permanent resident of Australia",
    'New Zealand citizen': "I'm a New Zealand citizen with full work rights in Australia",
    'Temporary visa with full work rights': 'I hold a temporary visa with full work rights',
    'Temporary visa with limited work rights': 'I hold a temporary visa with limited work rights',
    'Requires sponsorship': 'I would need visa sponsorship',
  };

  const FONT_STACKS = {
    'Liberation Sans': "'Arimo', 'Liberation Sans', Arial, sans-serif",
    'Carlito': "'Carlito', Calibri, sans-serif",
    'Inter': "'Inter', system-ui, sans-serif",
  };

  const SECTION_TITLES = {
    summary: 'Summary', experience: 'Experience', skills: 'Skills', portfolio: 'Portfolio',
    education: 'Education', credentials: 'Certifications and awards', referees: 'Referees',
  };
  const STANDARD_HEADINGS = ['summary', 'profile', 'experience', 'work experience', 'skills', 'portfolio', 'projects', 'education', 'certifications and awards', 'certifications', 'awards', 'publications', 'referees', 'references', 'volunteer work', 'languages'];

  /* ---------- KB helpers ---------- */
  function allHighlights(kb) {
    return [...kb.roles, ...(kb.volunteering || []), ...kb.portfolio].flatMap((e) => (e.highlights || []).map((h) => ({ ...h, owner: e })));
  }
  function findHighlight(kb, id) { return allHighlights(kb).find((h) => h.id === id); }
  function kbSkillList(kb) { return kb.skills.flatMap((g) => g.items); }

  function entryText(e) {
    return [e.title, e.company, e.name, e.summary, e.degree, e.institution, e.notes, e.kind, e.issuer, ...(e.highlights || []).flatMap((h) => [h.text, ...(h.skills || [])])].filter(Boolean).join(' ');
  }
  function kwMatch(text, kw) {
    const t = norm(text), k = norm(kw);
    if (t.includes(k)) return true;
    // loose matches: "Design system" vs "design systems", "Event-driven" vs "event driven"
    return t.replace(/-/g, ' ').includes(k.replace(/-/g, ' ').replace(/s$/, ''));
  }
  function matchedKeywords(text, keywords) { return keywords.filter((k) => kwMatch(text, k)); }

  function kbAllText(kb) {
    return [
      ...(kb.volunteering || []).map(entryText), ...(kb.additional || []).map(entryText), ...kb.roles.map(entryText), ...kb.portfolio.map(entryText), ...kb.education.map(entryText),
      ...kb.credentials.map(entryText), kbSkillList(kb).join(' '), kb.workRights.status, kb.workRights.noticePeriod,
    ].join(' ');
  }

  function suggestSelection(kb, brief) {
    const ids = [];
    [...(kb.volunteering || []), ...(kb.additional || []).filter(e => !e.referenceOnly)].forEach(e => ids.push(e.id));
    kb.roles.forEach((r) => ids.push(r.id));
    kb.portfolio.forEach((p) => { if (matchedKeywords(entryText(p), brief.keywords).length) ids.push(p.id); });
    kb.education.forEach((e) => ids.push(e.id));
    kb.credentials.forEach((c) => { if (c.kind === 'Certification' || matchedKeywords(entryText(c), brief.keywords).length) ids.push(c.id); });
    kb.referees.forEach((r) => ids.push(r.id));
    return ids;
  }

  /* ---------- Generation ---------- */
  function scoreHighlight(h, kws) { return matchedKeywords(h.text + ' ' + (h.skills || []).join(' '), kws).length; }

  // Evidence the user added for one of this job's must-haves always wins a place
  function pickBullets(entry, kws, n, mustHaves = []) {
    return (entry.highlights || [])
      .map((h, i) => ({ h, i, s: scoreHighlight(h, kws) + (mustHaves.includes(h.evidenceFor) ? 100 : 0) }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .slice(0, n)
      .map(({ h }) => ({ id: uid('b'), text: h.text, source: h.id }));
  }

  function buildSummary(kb, brief) {
    const role = kb.roles[0] || (kb.volunteering || [])[0];
    const skills = kbSkillList(kb).filter(k => kwMatch(brief.keywords.join(' '),k)).slice(0,4);
    return [role ? `${role.title}${role.company ? ' at ' + role.company : ''}.` : '', skills.length ? `Skills include ${skills.join(', ')}.` : '', `Applying for ${brief.title} at ${brief.company}.`].filter(Boolean).join(' ');
  }

  function generateResume(kb, brief, selected) {
    const sel = (e) => selected.includes(e.id);
    const kws = brief.keywords;
    const roles = kb.roles.filter(sel);
    const sections = [
      { id: uid('s'), kind: 'summary', title: SECTION_TITLES.summary, hidden: false, text: buildSummary(kb, brief) },
      {
        id: uid('s'), kind: 'experience', title: SECTION_TITLES.experience, hidden: false,
        items: roles.map((r, i) => ({ id: uid('i'), ref: r.id, heading: r.title, sub: r.company, meta: [r.location, [r.start,r.end].filter(Boolean).join(' to ')].filter(Boolean).join(' | '), bullets: pickBullets(r, kws, [4, 3, 2][i] || 2, brief.requirements) })),
      },
      {
        id: uid('s'), kind: 'skills', title: SECTION_TITLES.skills, hidden: false,
        items: kb.skills.map((g) => {
          const items = [...g.items].sort((a, b) => (matchedKeywords(b, kws).length - matchedKeywords(a, kws).length));
          return { id: uid('i'), ref: g.id, heading: g.group, line: items.join(', ') };
        }),
      },
      {
        id: uid('s'), kind: 'portfolio', title: SECTION_TITLES.portfolio, hidden: false,
        items: kb.portfolio.filter(sel).map((p) => ({ id: uid('i'), ref: p.id, heading: p.name, sub: p.summary, meta: p.link, bullets: pickBullets(p, kws, 1, brief.requirements) })),
      },
      {
        id: uid('s'), kind: 'education', title: SECTION_TITLES.education, hidden: false,
        items: kb.education.filter(sel).map((e) => ({ id: uid('i'), ref: e.id, heading: e.degree, sub: e.institution, meta: e.year, line: e.notes })),
      },
      {
        id: uid('s'), kind: 'credentials', title: SECTION_TITLES.credentials, hidden: false,
        items: kb.credentials.filter(sel).map((c) => ({ id: uid('i'), ref: c.id, heading: c.title, sub: c.issuer, meta: c.year })),
      },
      ...((kb.volunteering || []).filter(sel).length ? [{id:uid('s'),kind:'experience',title:'Volunteer work',hidden:false,items:kb.volunteering.filter(sel).map(r=>({id:uid('i'),ref:r.id,heading:r.title,sub:r.company,meta:[r.start,r.end].filter(Boolean).join(' to '),bullets:pickBullets(r, kws, 3, brief.requirements)}))}] : []),
      ...(kb.additional || []).filter(sel).map(e=>({id:uid('s'),kind:'additional',title:e.title,hidden:false,items:[{id:uid('i'),ref:e.id,heading:e.title,line:e.notes}]})),
      {
        id: uid('s'), kind: 'referees', title: SECTION_TITLES.referees, hidden: false,
        items: kb.referees.filter(sel).map((r) => ({ id: uid('i'), ref: r.id, heading: r.name, sub: [r.title,r.company].filter(Boolean).join(', '), meta: r.contact })),
      },
    ].filter((s) => s.kind === 'summary' || (s.items && s.items.length));
    return { kind: 'resume', theme: clone(MOCK.themeDefaults), sections };
  }

  // The user's notes for one application, used as a fact they supplied (mock: quoted as a sentence; the real LLM weaves it in)
  function notesSentence(notes) {
    const t = String(notes || '').trim().replace(/\s+/g, ' ');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.') : '';
  }

  function generateCoverLetter(kb, brief, notes = '') {
    const evidence = [...kb.roles, ...(kb.volunteering || []), ...kb.portfolio].flatMap(e => (e.highlights || []).map(h => h.text)).slice(0,2);
    const paras = [
      {title:'Opening',text:`I'm applying for the ${brief.title} role at ${brief.company}.`},
      ...(notesSentence(notes) ? [{title:'Motivation',text:notesSentence(notes)}] : []),
      {title:'Evidence',text:evidence.join(' ') || 'Add relevant achievements to your knowledge base to build this paragraph.'},
      {title:'Fit',text:kbSkillList(kb).length ? `My recorded skills include ${kbSkillList(kb).slice(0,5).join(', ')}.` : 'Review the job requirements and add supporting experience.'},
      {title:'Close',text:[RIGHTS_PHRASE[kb.workRights.status], 'Thank you for considering my application.'].filter(Boolean).join('. ')},
    ];
    return {
      kind: 'coverLetter',
      theme: clone(MOCK.themeDefaults),
      recipient: { name: 'Hiring team', company: brief.company, location: brief.location },
      sections: paras.map((p) => ({ id: uid('s'), kind: 'paragraph', title: p.title, hidden: false, text: p.text })),
    };
  }

  function createProject(kb, jdText, brief, selected, ts = Date.now(), notes = '') {
    const resume = generateResume(kb, brief, selected);
    const coverLetter = generateCoverLetter(kb, brief, notes);
    const rev = (doc) => [{ id: uid('r'), ts, kind: 'generation', label: 'Generated from job brief', snapshot: clone(doc) }];
    return {
      id: uid('p'), schemaVersion: 1,
      company: brief.company, role: brief.title, location: brief.location,
      createdAt: ts, updatedAt: ts,
      jdText, brief, selected, notes,
      docs: { resume, coverLetter },
      revisions: { resume: rev(resume), coverLetter: rev(coverLetter) },
    };
  }

  // Seed one project with a few issues so the checks panel has something to show.
  function applyDemoFlaws(p) {
    const exp = p.docs.resume.sections.find((s) => s.kind === 'experience');
    const bw = exp.items[0];
    let b = bw.bullets.find((x) => x.source === 'hl-bw-3');
    if (!b) { b = { id: uid('b'), text: '', source: 'hl-bw-3' }; bw.bullets.push(b); }
    b.text = 'Reduced AWS spend by 40% by right-sizing ECS services and adding autoscaling';
    const skills = p.docs.resume.sections.find((s) => s.kind === 'skills');
    skills.items[1].line = skills.items[1].line + ', Jest';
    const open = p.docs.coverLetter.sections[0];
    open.text = "I'm a passionate engineer. " + open.text;
    p.revisions.resume[0].snapshot = clone(p.docs.resume);
    p.revisions.coverLetter[0].snapshot = clone(p.docs.coverLetter);
  }

  /* ---------- Rendering (what Typst would compile) ---------- */
  function themeStyle(t) {
    return `--doc-font:${FONT_STACKS[t.font] || FONT_STACKS['Liberation Sans']};--doc-size:${t.baseSize}pt;--doc-h:${t.headingSize}pt;--doc-name:${t.nameSize}pt;--doc-margin:${t.margin}mm;--doc-lh:${t.lineHeight};--doc-gap:${t.sectionGap}pt;--doc-accent:${t.accent};`;
  }

  function contactLine(kb) {
    const c = kb.contact;
    return [c.location, c.phone, c.email, c.linkedin, c.github].filter(Boolean).map(esc).join('<span class="sep">|</span>');
  }

  function renderSectionBody(s) {
    if (s.kind === 'summary' || s.kind === 'paragraph') return `<p>${esc(s.text)}</p>`;
    if (s.kind === 'skills') return `<div class="skills">${s.items.map((it) => `<div class="skill-row" data-item-id="${it.id}"><strong>${esc(it.heading)}:</strong> ${esc(it.line)}</div>`).join('')}</div>`;
    return s.items.map((it) => `
      <div class="entry" data-item-id="${it.id}">
        <div class="entry-head"><span class="entry-title">${esc(it.heading)}</span>${it.meta ? `<span class="entry-meta">${esc(it.meta)}</span>` : ''}</div>
        ${it.sub ? `<div class="entry-sub">${esc(it.sub)}</div>` : ''}
        ${it.line ? `<div class="entry-line">${esc(it.line)}</div>` : ''}
        ${it.bullets && it.bullets.length ? `<ul>${it.bullets.map((b) => `<li data-bullet-id="${b.id}">${esc(b.text)}</li>`).join('')}</ul>` : ''}
      </div>`).join('');
  }

  function renderResume(doc, kb) {
    const c = kb.contact;
    return `
      <div class="sheet-inner doc-resume" style="${themeStyle(doc.theme)}">
        <header class="doc-header">
          <h1 class="doc-name">${esc(c.name)}</h1>
          <div class="doc-contact">${contactLine(kb)}</div>
          ${Store.state.prefs.spelling === 'en-AU' ? `<div class="doc-rights">${esc(kb.workRights.status)}</div>` : ''}
        </header>
        ${doc.sections.filter((s) => !s.hidden).map((s) => `
          <section class="doc-section" data-section-id="${s.id}">
            <h2 class="doc-h">${esc(s.title)}</h2>
            ${renderSectionBody(s)}
          </section>`).join('')}
      </div>`;
  }

  function renderCoverLetter(doc, kb, brief) {
    const c = kb.contact;
    const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    return `
      <div class="sheet-inner doc-letter" style="${themeStyle(doc.theme)}">
        <header class="doc-header">
          <h1 class="doc-name">${esc(c.name)}</h1>
          <div class="doc-contact">${contactLine(kb)}</div>
        </header>
        <div class="letter-meta">
          <div>${esc(date)}</div>
          <div class="letter-to">${esc(doc.recipient.name)}<br>${esc(doc.recipient.company)}<br>${esc(doc.recipient.location)}</div>
          <div class="letter-re"><strong>Re: ${esc(brief.title)}</strong></div>
          <div>Dear ${esc(doc.recipient.name)},</div>
        </div>
        ${doc.sections.filter((s) => !s.hidden).map((s) => `
          <section class="doc-section doc-para" data-section-id="${s.id}">${renderSectionBody(s)}</section>`).join('')}
        <div class="letter-sign">Kind regards,<br><br><strong>${esc(c.name)}</strong></div>
      </div>`;
  }

  function sectionPlainText(s) {
    if (s.text) return s.text;
    return (s.items || []).map((it) => [it.heading, it.sub, it.meta, it.line, ...(it.bullets || []).map((b) => b.text)].filter(Boolean).join(' ')).join(' ');
  }

  /* ---------- Plain text (for job portal text boxes; no LLM) ---------- */
  function sectionCopyText(s) {
    if (s.text != null) return s.text;
    const items = s.items || [];
    if (s.kind === 'skills') return items.map((it) => `${it.heading}: ${it.line}`).join('\n');
    return items.map((it) => [
      it.heading === s.title ? '' : [it.heading, it.sub].filter(Boolean).join(', ') + (it.meta ? ` (${it.meta})` : ''),
      it.line, ...(it.bullets || []).map((b) => '• ' + b.text),
    ].filter(Boolean).join('\n')).join(items.some((it) => it.bullets && it.bullets.length) ? '\n\n' : '\n');
  }

  function plainText(doc, kb, brief) {
    const c = kb.contact;
    const visible = doc.sections.filter((s) => !s.hidden);
    const head = [c.name, [c.location, c.phone, c.email, c.linkedin, c.github].filter(Boolean).join(' | ')];
    if (doc.kind === 'coverLetter') {
      return [...head, '', `Re: ${brief.title}`, '', `Dear ${doc.recipient.name},`, '', ...visible.map((s) => s.text + '\n'), 'Kind regards,', c.name].join('\n');
    }
    if (Store.state.prefs.spelling === 'en-AU' && kb.workRights.status) head.push(kb.workRights.status);
    return [...head, ...visible.map((s) => `\n${s.title.toUpperCase()}\n${sectionCopyText(s)}`)].join('\n');
  }

  /* ---------- Checks (rules engine, no LLM) ---------- */
  const NUM_RE = /\b\d[\d,.]*\s?(?:%|ms|s\b|M\b|k\b)?/g;
  // Number tokens without spaces or a closing full stop, so "5%" doesn't pass against "25%"; years don't count.
  const numbers = (t) => (t.match(NUM_RE) || []).map((n) => n.replace(/\s/g, '').replace(/[.,]+$/, '')).filter((n) => !/^(19|20)\d{2}$/.test(n));

  function runChecks(project, kind, kb) {
    const doc = project.docs[kind];
    const visible = doc.sections.filter((s) => !s.hidden);
    const fullText = visible.map(sectionPlainText).join(' ');
    const kws = project.brief.keywords;
    const matched = matchedKeywords(fullText, kws);
    const kbText = kbAllText(kb) + ' ' + (project.notes || ''); // notes count as facts the user supplied
    const missing = kws.filter((k) => !matched.includes(k)).map((k) => ({ keyword: k, inKb: kwMatch(kbText, k) }));
    const findings = [];
    const known = Array.from(new Set([...kbSkillList(kb), ...kws, 'Kubernetes', 'Java', 'Rust', 'Kafka', 'Angular', 'Vue']));

    // Banned phrases
    visible.forEach((s) => {
      const t = norm(sectionPlainText(s));
      MOCK.bannedPhrases.forEach((ph) => {
        if (new RegExp('\\b' + ph.replace(/[-]/g, '[- ]') + '\\b', 'i').test(t)) {
          findings.push({ type: 'banned', sectionId: s.id, title: `"${ph}" is on the banned-phrase list`, detail: `Found in ${s.title}. Phrases like this read as generic or AI-written.` });
        }
      });
    });

    // Claim grounding
    visible.forEach((s) => {
      (s.items || []).forEach((it) => {
        (it.bullets || []).forEach((b) => {
          const src = findHighlight(kb, b.source);
          if (!src) {
            findings.push({ type: 'grounding', sectionId: s.id, bulletId: b.id, title: 'Bullet has no source in your knowledge base', detail: `"${b.text.slice(0, 70)}…"` });
            return;
          }
          const srcText = src.text + ' ' + (src.metric || '');
          const srcNums = numbers(srcText);
          numbers(b.text).forEach((n) => {
            if (!srcNums.includes(n)) {
              findings.push({ type: 'grounding', sectionId: s.id, bulletId: b.id, title: `"${n}" doesn't match your knowledge base`, detail: `Under ${it.sub || it.heading}. Your knowledge base says: "${src.text}"` });
            }
          });
          known.forEach((term) => {
            if (term.length > 2 && kwMatch(b.text, term) && !kwMatch(srcText + ' ' + (src.skills || []).join(' '), term) && !kwMatch(entryText(src.owner), term)) {
              findings.push({ type: 'grounding', sectionId: s.id, bulletId: b.id, title: `Mentions ${term}, which this role doesn't record`, detail: `Under ${it.sub || it.heading}. Add it to the role in your knowledge base if it's true.` });
            }
          });
        });
      });
      if (s.kind === 'skills') {
        const kbSkills = kbSkillList(kb).map(norm);
        s.items.forEach((it) => splitSkills(it.line).forEach((sk) => {
          if (!kbSkills.includes(norm(sk))) findings.push({ type: 'grounding', sectionId: s.id, title: `Skill "${sk}" isn't in your knowledge base`, detail: 'Every claim needs a stored fact. Add the skill to your knowledge base or remove it here.' });
        }));
      }
      if (s.text) {
        const kbNums = numbers(kbText);
        const adNums = s.kind === 'paragraph' ? numbers(project.brief.requirements.join(' ')) : []; // the Fit paragraph quotes the ad
        numbers(s.text).forEach((n) => {
          if (!kbNums.includes(n) && !adNums.includes(n)) findings.push({ type: 'grounding', sectionId: s.id, title: `"${n}" doesn't appear in your knowledge base`, detail: `In ${s.title}.` });
        });
      }
    });

    const parse = [
      { label: 'Single-column layout', ok: true },
      { label: 'Selectable text in reading order', ok: true },
      { label: 'Standard section headings', ok: kind === 'coverLetter' || visible.every((s) => STANDARD_HEADINGS.includes(norm(s.title))), hint: 'Rename unusual headings so job sites can find them' },
      { label: 'No tables, columns or images', ok: true },
      { label: 'Contact details in the page body', ok: true },
    ];
    return { matched, missing, findings, parse };
  }

  /* ---------- Mock LLM ---------- */
  const TECH_TERMS = ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Node.js', 'GraphQL', 'REST', 'PostgreSQL', 'SQL', 'Redis', 'AWS', 'Lambda', 'SQS', 'EventBridge', 'Terraform', 'Docker', 'Kubernetes', 'Python', 'Go', 'Playwright', 'Jest', 'CI/CD', 'GitHub Actions', 'Accessibility', 'WCAG', 'Performance', 'Design system', 'Mentoring', 'Leadership', 'Testing', 'Monitoring', 'Real-time', 'Event-driven', 'Fintech', 'Government', 'User research', 'Cost', 'Tailwind CSS', 'Storybook'];

  function extractBrief(text) {
    const sample = MOCK.jds.find((j) => text.includes(j.brief.title) && text.includes(j.brief.company));
    if (sample) return clone(sample.brief);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const bullets = lines.filter((l) => /^[-•*]/.test(l)).map((l) => l.replace(/^[-•*]\s*/, ''));
    const companyLine = lines[1] || '';
    const company = (companyLine.split(/[,(]/)[0] || '').trim() || (text.match(/\bat ([A-Z][\w&]+(?: [A-Z][\w&]+)*)/) || [])[1] || 'Unknown company';
    const loc = (text.match(/\b(Sydney|Melbourne|Brisbane|Perth|Adelaide|Canberra|Hobart|Darwin)(?: [A-Z]{2,3})?/) || [])[0] || 'Australia';
    const keywords = TECH_TERMS.filter((t) => kwMatch(text, t)).slice(0, 14);
    return {
      title: lines[0] ? lines[0].slice(0, 60) : 'Untitled role',
      company,
      location: loc,
      team: '',
      requirements: bullets.slice(0, 6).length ? bullets.slice(0, 6) : ['No bulleted requirements found; edit the brief if needed'],
      niceToHave: bullets.slice(6, 9),
      keywords: keywords.length ? keywords : ['Communication', 'Teamwork'],
      workRights: /working rights|citizen|visa/i.test(text) ? 'Working rights mentioned' : 'Not stated',
    };
  }

  const FILLERS = [[/\bsuccessfully\s+/gi, ''], [/\bin order to\b/gi, 'to'], [/\bvarious\s+/gi, ''], [/\butilis(e|ing)\b/gi, (m, g) => (g === 'e' ? 'use' : 'using')], [/\breally\s+/gi, ''], [/\bvery\s+/gi, '']];
  const STRONGER = [[/^Built\b/, 'Engineered'], [/^Rebuilt\b/, 'Re-architected'], [/^Reduced\b/, 'Cut'], [/^Introduced\b/, 'Established'], [/^Wrote\b/, 'Developed'], [/^Fixed\b/, 'Resolved'], [/^Ran\b/, 'Led'], [/^Migrated\b/, 'Moved'], [/\bI also\b/, 'I also'], [/^Designed\b/, 'Architected']];

  function conciseText(t, isParagraph) {
    FILLERS.forEach(([re, rep]) => (t = t.replace(re, rep)));
    if (isParagraph) {
      const sents = t.match(/[^.!?]+[.!?]+/g) || [t];
      if (sents.length > 2) sents.splice(sents.length - 2, 1);
      return sents.join(' ').replace(/\s+/g, ' ').trim()
        .replace(/, and the work your .*? lines up closely with mine\./, '.')
        .replace(/ I like working closely with product and design, and I'd bring the same habits to [^.]+\./, '');
    }
    return t.replace(/, (?:cutting|bringing|with|that|lifting|and)\b[^,]*$/i, (m) => (/\d/.test(m) ? m : ''))
      .replace(/ through their first year/, '').replace(/ end to end$/, '').trim();
  }

  function rewriteSection(section, instruction, kb) {
    const ins = norm(instruction);
    const next = clone(section);
    const warnings = [];
    const isPara = !!next.text;
    const textsOf = (s) => (s.text != null ? [s.text] : (s.items || []).flatMap((it) => (it.bullets || []).map((b) => b.text).concat(it.line ? [it.line] : [])));
    const mapTexts = (fn) => {
      if (next.text != null) next.text = fn(next.text, null);
      else next.items.forEach((it) => {
        (it.bullets || []).forEach((b) => (b.text = fn(b.text, b)));
      });
    };

    const emph = instruction.match(/(?:emphasi[sz]e|highlight|focus on|more about|mention)\s+(.+)/i);
    if (emph) {
      const term = emph[1].replace(/[."']+$/g, '').trim();
      const inKb = kwMatch(kbAllText(kb), term);
      if (section.kind === 'skills') {
        next.items.forEach((it) => {
          const parts = splitSkills(it.line);
          const hits = parts.filter((p) => kwMatch(p, term));
          it.line = [...hits, ...parts.filter((p) => !hits.includes(p))].join(', ');
        });
        const hasRow = next.items.some((it) => kwMatch(it.line, term));
        if (!hasRow) { next.items[0].line = term + ', ' + next.items[0].line; }
        next.items.sort((a, b) => (kwMatch(b.line, term) ? 1 : 0) - (kwMatch(a.line, term) ? 1 : 0));
      } else if (isPara) {
        if (!kwMatch(next.text, term)) {
          next.text = next.text.replace(/(\.)(\s|$)/, `, with a particular focus on ${term}$1$2`);
        } else {
          next.text = next.text.replace(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'), '$1');
          const sents = next.text.match(/[^.!?]+[.!?]+/g) || [next.text];
          const idx = sents.findIndex((x) => kwMatch(x, term));
          if (idx > 0) { const [s] = sents.splice(idx, 1); sents.unshift(s.trim()); }
          next.text = sents.map((x) => x.trim()).join(' ');
        }
      } else {
        // Grounded first: reorder bullets and swap in matching highlights from the KB
        const hlMatches = (h) => h && kwMatch(h.text + ' ' + (h.skills || []).join(' '), term);
        let anyMatch = false;
        next.items.forEach((it) => {
          if (!it.bullets) return;
          const owner = [...kb.roles, ...(kb.volunteering || []), ...kb.portfolio].find((e) => e.id === it.ref);
          const src = (b) => findHighlight(kb, b.source);
          it.bullets.sort((a, b) => (hlMatches(src(b)) ? 1 : 0) - (hlMatches(src(a)) ? 1 : 0));
          if (owner && !it.bullets.some((b) => hlMatches(src(b)))) {
            const extra = owner.highlights.find((h) => hlMatches(h) && !it.bullets.some((b) => b.source === h.id));
            if (extra && it.bullets.length) { it.bullets.pop(); it.bullets.unshift({ id: uid('b'), text: extra.text, source: extra.id }); }
          }
          if (it.bullets.some((b) => hlMatches(src(b)))) anyMatch = true;
        });
        if (!anyMatch && !inKb) {
          const it = next.items.find((x) => x.bullets && x.bullets.length);
          if (it) it.bullets[0].text = it.bullets[0].text.replace(/(,| by | with )|$/, (m) => ` using ${term}${m}`);
        }
      }
      if (!inKb) warnings.push(`${term} isn't in your knowledge base. If you accept, checks will flag it as an unsupported claim.`);
    } else if (/concise|shorter|tighten|trim|brief/.test(ins)) {
      mapTexts((t) => conciseText(t, isPara));
    } else if (/formal/.test(ins)) {
      mapTexts((t) => t.replace(/I'm/g, 'I am').replace(/I've/g, 'I have').replace(/I'd/g, 'I would').replace(/can't/g, 'cannot').replace(/a chat/g, 'the opportunity to discuss').replace(/lines up closely with/g, 'aligns closely with').replace(/I like/g, 'I value'));
    } else if (/warm|friendly|conversational|casual/.test(ins)) {
      mapTexts((t) => t.replace(/I am/g, "I'm").replace(/I have/g, "I've").replace(/Thank you for considering my application; /, 'Thanks for reading. ').replace(/I'd welcome a chat about the role\./, "I'd love to chat about the role.").replace(/^I'm applying for/, "I'd love to be considered for").replace(/lines up closely with mine/, 'feels like a natural fit for me').replace(/^At ([^,]+?) I /, "At $1, one of the things I'm proudest of is that I ").replace(/^Your ad mentions/, 'I noticed your ad mentions'));
    } else if (/strong|confident|verb|impact|punch/.test(ins)) {
      mapTexts((t) => { let o = t; STRONGER.forEach(([re, rep]) => (o = o.replace(re, rep))); return o.replace(/I've spent/, 'I have spent').replace(/I also /, 'I also '); });
    } else if (/metric|number|quantif/.test(ins)) {
      if (!isPara) next.items.forEach((it) => it.bullets && it.bullets.sort((a, b) => (/\d/.test(b.text) ? 1 : 0) - (/\d/.test(a.text) ? 1 : 0)));
      mapTexts((t) => t);
    } else {
      mapTexts((t) => { let o = t; FILLERS.forEach(([re, rep]) => (o = o.replace(re, rep))); STRONGER.forEach(([re, rep]) => (o = o.replace(re, rep))); return o; });
    }

    const changed = JSON.stringify(textsOf(next)) !== JSON.stringify(textsOf(section)) || JSON.stringify(next) !== JSON.stringify(section);
    return { section: next, changed, warnings };
  }

  // The real app counts the request it would send (SPEC §8.3): ~380 plus a token per 2 characters. The mock stands in
  // ~4,300 characters for the system prompt and the section's knowledge base entries.
  function estimateTokens(section) { return Math.round((380 + (sectionPlainText(section).length + 4300) / 2) / 10) * 10; }

  /* ---------- Word diff ---------- */
  function wordDiff(a, b) {
    const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0, j = 0, out = '';
    while (i < n && j < m) {
      if (A[i] === B[j]) { out += esc(A[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out += `<del>${esc(A[i])}</del>`; i++; }
      else { out += `<ins>${esc(B[j])}</ins>`; j++; }
    }
    while (i < n) out += `<del>${esc(A[i++])}</del>`;
    while (j < m) out += `<ins>${esc(B[j++])}</ins>`;
    return out.replace(/<\/del><del>/g, '').replace(/<\/ins><ins>/g, '');
  }

  function sectionDiffHtml(before, after) {
    if (before.text != null) return `<p>${wordDiff(before.text, after.text)}</p>`;
    return after.items.map((it) => {
      const old = before.items.find((x) => x.id === it.id) || {};
      const rows = [];
      if (it.line != null) rows.push(`<div class="diff-line">${wordDiff(old.line || '', it.line)}</div>`);
      (it.bullets || []).forEach((b, j) => {
        const oi = (old.bullets || []).findIndex((x) => x.id === b.id);
        const ob = old.bullets && old.bullets[oi];
        const tag = oi < 0 ? '<span class="diff-tag">from knowledge base</span>' : oi > j ? '<span class="diff-tag">moved up</span>' : '';
        rows.push(`<li>${wordDiff(ob ? ob.text : '', b.text)}${tag}</li>`);
      });
      (old.bullets || []).filter((ob) => !(it.bullets || []).some((b) => b.id === ob.id))
        .forEach((ob) => rows.push(`<li class="diff-removed"><del>${esc(ob.text)}</del><span class="diff-tag">removed</span></li>`));
      return `<div class="diff-item"><div class="diff-item-head">${esc(it.sub || it.heading)}</div>${it.bullets ? `<ul>${rows.join('')}</ul>` : rows.join('')}</div>`;
    }).join('');
  }

  function fileName(kb, kind, company) {
    const name = kb.contact.name.trim().split(/\s+/).join('-');
    const co = String(company).replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
    return `${name}-${kind === 'resume' ? 'Resume' : 'Cover-Letter'}-${co}.pdf`;
  }

  return {
    FONT_STACKS, SECTION_TITLES, allHighlights, findHighlight, entryText, matchedKeywords, kwMatch, kbAllText,
    suggestSelection, createProject, generateResume, generateCoverLetter, applyDemoFlaws,
    renderResume, renderCoverLetter, sectionPlainText, sectionCopyText, plainText, runChecks,
    extractBrief, rewriteSection, estimateTokens, sectionDiffHtml, fileName,
  };
})();

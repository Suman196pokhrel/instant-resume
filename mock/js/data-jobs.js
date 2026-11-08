/* Mock data for Job sweeps: platforms, search profile, sweeps (scheduled crawls), crawled jobs and
   past applications. Each job's `text` follows the shape Docs.extractBrief parses
   (line 1 title, line 2 "Company, City", requirements as "- " bullets) so it can go straight into the pipeline. */

window.JOBS_MOCK = (function () {
  const platforms = [
    { id: 'seek', name: 'SEEK', short: 'SK', hue: 330, method: 'Headless crawler (Playwright)', rate: '1 request / 2s', note: 'Search result pages, then each listing.' },
    { id: 'linkedin', name: 'LinkedIn', short: 'in', hue: 212, method: 'Job alert emails (parsed)', rate: 'Push, no crawling', note: "LinkedIn doesn't allow scraping, so this source reads the job alert emails LinkedIn already sends you." },
    { id: 'indeed', name: 'Indeed', short: 'Id', hue: 232, method: 'Headless crawler (Playwright)', rate: '1 request / 3s', note: 'Search result pages.' },
    { id: 'jora', name: 'Jora', short: 'Jo', hue: 150, method: 'Search pages over HTTP', rate: '1 request / 2s', note: 'Lightweight fetch, no browser needed.' },
    { id: 'apsjobs', name: 'APSJobs', short: 'AP', hue: 28, method: 'Public RSS feed', rate: 'Feed, every run', note: 'Australian Public Service vacancies.' },
    { id: 'workable', name: 'Company career pages', short: 'CP', hue: 262, method: 'ATS boards (Greenhouse, Lever, Workable)', rate: 'Public JSON endpoints', note: 'Watch a list of companies you care about.' },
  ];

  const profile = {
    mode: 'kb', // 'kb' uses the knowledge base; 'separate' uses the fields below
    label: 'Jordan, search bot',
    titles: ['Senior Frontend Engineer', 'Senior Full Stack Engineer', 'Lead Engineer'],
    locations: ['Sydney NSW', 'Remote (Australia)'],
    workTypes: ['Hybrid', 'Remote'],
    salaryFloor: 160000,
    seniority: ['Senior', 'Lead'],
    workRights: 'Australian citizen',
    avoid: ['Gambling', 'Crypto', 'Recruitment agencies', 'Contracts under 6 months'],
    ideal: 'Product companies with a real engineering culture. React and TypeScript on the frontend, ideally some Node or AWS. I like performance work, design systems and mentoring. Hybrid in Sydney or fully remote. No agencies.',
  };

  // Domain hues, shared by the inbox chips and the career map
  // Domains of the sample job descriptions in data.js, so their projects land in the right cluster
  const companyDomains = { Harbourline: 'Fintech', 'Tessellate Health': 'Health', 'Southerly Energy': 'Climate', 'Lumen Rail': 'Logistics', Mintleaf: 'Fintech' };

  const domains = {
    Fintech: 168, Health: 330, Logistics: 28, Government: 212, Climate: 120, Media: 262, Education: 48, Retail: 0,
  };

  function jdText(j) {
    return `${j.title}
${j.company}, ${j.location}

${j.blurb}

What you'll do
${j.reqs.slice(0, 3).map((r) => '- ' + r).join('\n')}

About you
${j.reqs.slice(3).map((r) => '- ' + r).join('\n')}

${j.rights || 'You must have full working rights in Australia.'}`;
  }

  // score parts: skills, seniority, location, salary, rights (0..1)
  const jobs = [
    { id: 'job-quokka', title: 'Senior Frontend Engineer', company: 'Quokka Pay', location: 'Sydney NSW', mode: 'Hybrid', salary: '$175k – $195k + super', platform: 'seek', hoursAgo: 3, sweep: 'sw-syd', domain: 'Fintech', score: 94, verdict: 'keep',
      parts: [0.96, 1, 1, 1, 1], keywords: ['React', 'TypeScript', 'Performance', 'Design system', 'Accessibility', 'Next.js'], missing: [],
      reason: 'Strong overlap with your Brightwater dashboard rebuild and design system work. Senior IC role, hybrid in Sydney, and the salary clears your floor.',
      blurb: 'Quokka Pay builds tap-to-pay for small merchants across Australia.',
      reqs: ['Own the merchant dashboard built in React and TypeScript', 'Lift Core Web Vitals across our Next.js app', 'Grow our design system with the design team', '5+ years building production web apps', 'Strong accessibility (WCAG 2.2) knowledge', 'Experience mentoring other engineers'], status: 'new' },
    { id: 'job-tidal', title: 'Senior Full Stack Engineer', company: 'Tidal Grid', location: 'Sydney NSW', mode: 'Remote', salary: '$170k – $190k', platform: 'linkedin', hoursAgo: 6, sweep: 'sw-syd', domain: 'Climate', score: 89, verdict: 'keep',
      parts: [0.88, 1, 1, 1, 1], keywords: ['React', 'TypeScript', 'Node.js', 'AWS', 'Event-driven', 'Terraform'], missing: ['Real-time'],
      reason: 'Your event-driven pricing service on Lambda and SQS maps to their energy-trading pipeline. Fully remote. The one gap is real-time streaming.',
      blurb: 'Tidal Grid helps households sell battery power back to the grid.',
      reqs: ['Ship features across a Node.js API and React app', 'Design event-driven services on AWS', 'Manage infrastructure with Terraform', '5+ years as a full stack engineer', 'TypeScript across the stack', 'Real-time data experience (WebSockets or similar)'], status: 'new' },
    { id: 'job-harvest', title: 'Lead Frontend Engineer', company: 'Harvest & Co', location: 'Sydney NSW', mode: 'Hybrid', salary: '$185k – $210k', platform: 'seek', hoursAgo: 11, sweep: 'sw-syd', domain: 'Retail', score: 86, verdict: 'keep',
      parts: [0.82, 0.9, 1, 1, 1], keywords: ['React', 'TypeScript', 'Leadership', 'Mentoring', 'Testing'], missing: ['Tailwind CSS'],
      reason: 'Lead role with a team of four, which fits your mentoring record. Stack matches apart from Tailwind, which is quick to pick up.',
      blurb: 'Harvest & Co runs grocery delivery for 40,000 households in Sydney.',
      reqs: ['Lead a team of four frontend engineers', 'Set testing standards with Playwright', 'Partner with product on the roadmap', '6+ years with React and TypeScript', 'Experience leading or mentoring engineers', 'Tailwind CSS'], status: 'saved' },
    { id: 'job-medibank', title: 'Senior Software Engineer, Web', company: 'Wattle Health', location: 'Melbourne VIC', mode: 'Remote', salary: '$165k – $180k', platform: 'indeed', hoursAgo: 20, sweep: 'sw-syd', domain: 'Health', score: 81, verdict: 'keep',
      parts: [0.84, 1, 0.8, 0.9, 1], keywords: ['React', 'TypeScript', 'Accessibility', 'GraphQL'], missing: ['Healthcare'],
      reason: 'Accessibility-heavy patient portal, which suits your WCAG work. Melbourne-based but remote is fine. No healthcare background, which they list as a bonus only.',
      blurb: 'Wattle Health runs telehealth appointments for regional clinics.',
      reqs: ['Build our patient portal in React', 'Champion accessibility across the product', 'Work with our GraphQL API team', '5+ years with React and TypeScript', 'WCAG 2.2 AA experience', 'Healthcare product experience (bonus)'], status: 'new' },
    { id: 'job-dta', title: 'Senior Frontend Developer', company: 'Digital Services Office', location: 'Canberra ACT', mode: 'Hybrid', salary: '$150k – $165k + 15.4% super', platform: 'apsjobs', hoursAgo: 28, sweep: 'sw-gov', domain: 'Government', score: 78, verdict: 'keep',
      parts: [0.8, 1, 0.6, 0.85, 1], keywords: ['React', 'Accessibility', 'Design system', 'Government'], missing: ['Baseline clearance'],
      reason: 'Design system role for government services. You are eligible for Baseline clearance. Canberra hybrid is a stretch on location, and base pay sits under your floor, but the super is higher.',
      blurb: 'We build the shared design system used by government services nationwide.',
      reqs: ['Maintain the national design system', 'Make services meet WCAG 2.2 AA', 'Work in multidisciplinary teams', '5+ years in frontend development', 'React and modern CSS', 'Australian citizen, able to get Baseline clearance'], rights: 'Australian citizenship is required. You must be able to obtain a Baseline security clearance.', status: 'new' },
    { id: 'job-canva', title: 'Frontend Engineer, Performance', company: 'Brushstroke', location: 'Sydney NSW', mode: 'Hybrid', salary: '$170k – $200k + equity', platform: 'workable', hoursAgo: 34, sweep: 'sw-syd', domain: 'Media', score: 84, verdict: 'keep',
      parts: [0.9, 0.85, 1, 1, 1], keywords: ['Performance', 'React', 'TypeScript', 'Monitoring'], missing: ['WebGL'],
      reason: 'A performance-focused team, and your 4.2s to 1.1s load improvement is exactly their pitch. WebGL is the gap, and they list it as nice to have.',
      blurb: 'Brushstroke is an online design tool used by 12 million people.',
      reqs: ['Profile and speed up our editor', 'Build performance monitoring and budgets', 'Work across React and canvas rendering', '4+ years with React and TypeScript', 'Deep knowledge of browser performance', 'WebGL experience (nice to have)'], status: 'new' },
    { id: 'job-freight', title: 'Senior Software Engineer', company: 'Linehaul', location: 'Brisbane QLD', mode: 'Remote', salary: '$160k – $175k', platform: 'jora', hoursAgo: 46, sweep: 'sw-remote', domain: 'Logistics', score: 76, verdict: 'maybe',
      parts: [0.86, 1, 0.8, 0.75, 1], keywords: ['Node.js', 'AWS', 'React', 'Cost'], missing: ['Go'],
      reason: 'Same domain as Brightwater, so your logistics context is a plus. Backend leans on Go, which is not in your knowledge base. Salary is at the floor.',
      blurb: 'Linehaul runs freight booking for 900 trucking companies.',
      reqs: ['Build booking services in Go and Node.js', 'Own AWS costs for your services', 'Work on the React carrier portal', '5+ years in software engineering', 'Go or willingness to learn it fast', 'AWS in production'], status: 'new' },
    { id: 'job-learn', title: 'Staff Engineer, Web Platform', company: 'Lumen Learning', location: 'Sydney NSW', mode: 'Hybrid', salary: '$210k – $240k', platform: 'linkedin', hoursAgo: 52, sweep: 'sw-syd', domain: 'Education', score: 72, verdict: 'maybe',
      parts: [0.8, 0.6, 1, 1, 1], keywords: ['React', 'Design system', 'Leadership', 'CI/CD'], missing: ['Staff-level scope', 'Monorepo tooling'],
      reason: 'Good stack match, but Staff is a level above your current title. Worth a look if you want to stretch. Hiring manager asks for org-wide technical direction.',
      blurb: 'Lumen Learning makes reading apps for 3,000 Australian primary schools.',
      reqs: ['Set technical direction for the web platform', 'Own our monorepo and build tooling', 'Run the frontend guild', '8+ years in software engineering', 'Experience at Staff level or equivalent', 'Design systems at scale'], status: 'new' },
  ];
  // Found by the first sweep you run in the mock, so a run visibly adds to the inbox
  const freshJobs = [
    { id: 'job-kite', title: 'Senior Frontend Engineer', company: 'Kite Insurance', location: 'Sydney NSW', mode: 'Hybrid', salary: '$170k – $185k', platform: 'seek', hoursAgo: 0.4, sweep: 'sw-syd', domain: 'Fintech', score: 91, verdict: 'keep',
      parts: [0.92, 1, 1, 1, 1], keywords: ['React', 'TypeScript', 'Testing', 'Playwright', 'Accessibility'], missing: [],
      reason: 'Claims-portal rebuild in React. Your Playwright work that cut rollbacks from 6 to 1 a quarter lines up with their reliability push.',
      blurb: 'Kite Insurance sells home and car insurance online.',
      reqs: ['Rebuild our claims portal in React and TypeScript', 'Own end-to-end tests in Playwright', 'Make every flow WCAG 2.2 AA', '5+ years building production web apps', 'Testing as a habit, not an afterthought', 'Clear written communication'], status: 'new' },
    { id: 'job-orbit', title: 'Full Stack Engineer', company: 'Orbit Freight', location: 'Sydney NSW', mode: 'Hybrid', salary: '$160k – $175k', platform: 'indeed', hoursAgo: 0.9, sweep: 'sw-syd', domain: 'Logistics', score: 83, verdict: 'keep',
      parts: [0.86, 0.9, 1, 0.8, 1], keywords: ['React', 'Node.js', 'AWS', 'Event-driven'], missing: ['Kubernetes'],
      reason: 'Logistics again, so Brightwater carries over well. They run on EKS, and Kubernetes is the gap.',
      blurb: 'Orbit Freight books container space for importers.',
      reqs: ['Build booking flows across React and Node.js', 'Run event-driven services on AWS', 'Improve our EKS deployment pipeline', '4+ years as a full stack engineer', 'AWS in production', 'Kubernetes experience'], status: 'new' },
  ];
  jobs.concat(freshJobs).forEach((j) => { j.text = jdText(j); });

  // Jobs the filters threw out, kept so you can audit the bot
  const rejected = [
    { title: 'Frontend Developer', company: 'TalentBridge Recruitment', platform: 'seek', stage: 'Hard filters', reason: 'Recruitment agency (on your avoid list)' },
    { title: 'React Developer, 3-month contract', company: 'Confidential', platform: 'indeed', stage: 'Hard filters', reason: 'Contract under 6 months' },
    { title: 'Senior Frontend Engineer', company: 'LuckySpin', platform: 'seek', stage: 'Hard filters', reason: 'Gambling (on your avoid list)' },
    { title: 'Junior Web Developer', company: 'Pixel Foundry', platform: 'jora', stage: 'Hard filters', reason: 'Salary $75k, under your $160k floor' },
    { title: 'Senior Backend Engineer (Java)', company: 'Ledgerline', platform: 'linkedin', stage: 'Semantic match', reason: 'Similarity 0.41: Java and Spring, no frontend' },
    { title: 'Data Engineer', company: 'Tidal Grid', platform: 'linkedin', stage: 'Semantic match', reason: 'Similarity 0.38: data pipelines, not product engineering' },
    { title: 'Senior Frontend Engineer', company: 'ChainVault', platform: 'indeed', stage: 'LLM judge', reason: 'Crypto custody product (on your avoid list, mentioned only in the body)' },
    { title: 'Engineering Manager', company: 'Harvest & Co', platform: 'seek', stage: 'LLM judge', reason: 'People-management role with no hands-on coding; you asked for IC or Lead' },
    { title: 'Senior Frontend Engineer', company: 'Quokka Pay', platform: 'linkedin', stage: 'Dedupe', reason: 'Same listing as SEEK #81920344 (merged)' },
  ];

  const sweeps = [
    { id: 'sw-syd', name: 'Sydney product engineering', platforms: ['seek', 'linkedin', 'indeed', 'workable'], query: 'Senior frontend or full stack, React, TypeScript',
      schedule: { text: 'Every weekday at 7am', crons: ['0 7 * * 1-5'] }, active: true, autoTailor: { on: true, threshold: 90, mode: 'quick' },
      lastFunnel: { crawled: 412, deduped: 268, hard: 97, semantic: 31, llm: 9 } },
    { id: 'sw-remote', name: 'Remote, anywhere in Australia', platforms: ['jora', 'linkedin', 'workable'], query: 'Remote senior software engineer',
      schedule: { text: 'Every 6 hours', crons: ['0 */6 * * *'] }, active: true, autoTailor: { on: false, threshold: 90, mode: 'quick' },
      lastFunnel: { crawled: 188, deduped: 141, hard: 52, semantic: 14, llm: 3 } },
    { id: 'sw-gov', name: 'Government digital roles', platforms: ['apsjobs'], query: 'Frontend, design system, accessibility',
      schedule: { text: 'Mondays and Thursdays at 8:30am', crons: ['30 8 * * 1,4'] }, active: false, autoTailor: { on: false, threshold: 90, mode: 'quick' },
      lastFunnel: { crawled: 36, deduped: 36, hard: 11, semantic: 4, llm: 1 } },
  ];

  // Run history (days ago, sweep, kept, crawled, ok)
  const runs = [
    [0, 'sw-syd', 9, 412, 'ok'], [0, 'sw-remote', 1, 61, 'ok'], [0, 'sw-remote', 0, 44, 'ok'], [1, 'sw-syd', 4, 380, 'ok'],
    [1, 'sw-remote', 2, 70, 'ok'], [1, 'sw-remote', 0, 39, 'warn'], [2, 'sw-syd', 6, 401, 'ok'], [2, 'sw-gov', 1, 36, 'ok'],
    [3, 'sw-syd', 3, 356, 'ok'], [3, 'sw-remote', 1, 58, 'ok'], [4, 'sw-syd', 0, 0, 'fail'], [5, 'sw-gov', 0, 29, 'ok'],
  ];

  // Applications made before this mock (for the career map). Status flow: applied > interview > offer | rejected | ghosted
  const history = [
    { id: 'app-1', title: 'Senior Frontend Engineer', company: 'Harbourline', domain: 'Fintech', status: 'interview', daysAgo: 9, keywords: ['React', 'TypeScript', 'Performance', 'Design system', 'Fintech', 'GraphQL'], projectRef: 'Harbourline' },
    { id: 'app-2', title: 'Full Stack Engineer', company: 'Tessellate Health', domain: 'Health', status: 'applied', daysAgo: 3, keywords: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'Redis'], projectRef: 'Tessellate Health' },
    { id: 'app-3', title: 'Platform Engineer', company: 'Southerly Energy', domain: 'Climate', status: 'rejected', daysAgo: 15, keywords: ['AWS', 'Terraform', 'Node.js', 'Monitoring'], projectRef: 'Southerly Energy' },
    { id: 'app-4', title: 'Frontend Engineer', company: 'Coinstack', domain: 'Fintech', status: 'ghosted', daysAgo: 31, keywords: ['React', 'TypeScript', 'Fintech', 'Testing'] },
    { id: 'app-5', title: 'Senior React Developer', company: 'Parcelpoint', domain: 'Logistics', status: 'offer', daysAgo: 24, keywords: ['React', 'AWS', 'Performance', 'Node.js'] },
    { id: 'app-6', title: 'Web Platform Engineer', company: 'Readwell', domain: 'Education', status: 'rejected', daysAgo: 40, keywords: ['CI/CD', 'React', 'Leadership'] },
    { id: 'app-7', title: 'Senior Frontend Engineer', company: 'Streamly', domain: 'Media', status: 'interview', daysAgo: 12, keywords: ['React', 'Performance', 'Monitoring', 'TypeScript'] },
  ];

  // When matching jobs were posted over the last 8 weeks: [day 0=Mon..6=Sun][hour 0..23] counts
  const postingHeat = Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => {
    const work = d < 5 ? 1 : 0.18;
    const morning = Math.exp(-((h - 9) ** 2) / 5) * 9;
    const arvo = Math.exp(-((h - 15) ** 2) / 7) * 4;
    const midweek = d >= 1 && d <= 3 ? 1.35 : 1;
    const noise = ((d * 31 + h * 17) % 7) / 7;
    return Math.max(0, Math.round((morning + arvo) * work * midweek + noise * 1.4 - 0.4));
  }));

  return { jdText, platforms, profile, domains, companyDomains, jobs, freshJobs, rejected, sweeps, runs, history, postingHeat };
})();

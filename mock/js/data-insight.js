/* Mock data for: Listing check (is this job real?), people to contact per job, and resume experiments.
   Everything is fictional. Days are "days ago" relative to now; months run oldest to newest (12 values). */

window.INSIGHT_MOCK = (function () {
  // Company background, as a listing check would assemble it from public sources
  const companies = {
    'Quokka Pay': { headcount: [96, 99, 104, 108, 111, 115, 118, 123, 127, 132, 137, 142], openings: [3, 4, 4, 5, 3, 4, 5, 6, 4, 5, 6, 6], layoffs: null, careersPage: true, track: { posted: 22, filled: 19, medianDays: 34 }, founded: 2019 },
    'Tidal Grid': { headcount: [58, 60, 61, 63, 66, 68, 70, 71, 74, 77, 79, 82], openings: [2, 3, 2, 3, 4, 3, 3, 4, 3, 4, 4, 5], layoffs: null, careersPage: true, track: { posted: 14, filled: 12, medianDays: 41 }, founded: 2020 },
    'Harvest & Co': { headcount: [310, 312, 315, 318, 322, 325, 324, 326, 330, 334, 337, 340], openings: [8, 7, 9, 8, 10, 9, 8, 9, 10, 9, 11, 10], layoffs: null, careersPage: true, track: { posted: 38, filled: 31, medianDays: 29 }, founded: 2016 },
    'Wattle Health': { headcount: [140, 141, 143, 142, 144, 146, 148, 149, 151, 150, 152, 154], openings: [3, 2, 3, 3, 2, 4, 3, 3, 2, 3, 4, 3], layoffs: null, careersPage: true, track: { posted: 12, filled: 9, medianDays: 47 }, founded: 2017 },
    'Digital Services Office': { headcount: [880, 882, 885, 884, 887, 890, 892, 895, 894, 897, 899, 902], openings: [12, 14, 11, 13, 15, 12, 14, 13, 12, 15, 14, 13], layoffs: null, careersPage: true, track: { posted: 61, filled: 55, medianDays: 52 }, founded: 2015 },
    Brushstroke: { headcount: [2400, 2430, 2450, 2470, 2490, 2520, 2540, 2560, 2580, 2610, 2640, 2660], openings: [40, 44, 38, 46, 50, 42, 45, 48, 44, 52, 49, 51], layoffs: null, careersPage: true, track: { posted: 190, filled: 168, medianDays: 38 }, founded: 2013 },
    Linehaul: { headcount: [410, 412, 415, 418, 416, 414, 409, 402, 398, 352, 349, 347], openings: [6, 7, 9, 11, 12, 14, 15, 17, 18, 21, 22, 23], layoffs: { monthsAgo: 2, people: 52, pct: 13 }, careersPage: false, track: { posted: 41, filled: 6, medianDays: null }, founded: 2014 },
    'Lumen Learning': { headcount: [205, 206, 206, 207, 205, 206, 207, 206, 205, 206, 207, 206], openings: [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8], layoffs: null, careersPage: true, track: { posted: 19, filled: 9, medianDays: 96 }, founded: 2012 },
    'Kite Insurance': { headcount: [520, 522, 526, 529, 531, 534, 538, 541, 545, 548, 552, 556], openings: [9, 8, 10, 11, 9, 10, 12, 11, 10, 12, 13, 12], layoffs: null, careersPage: true, track: { posted: 47, filled: 40, medianDays: 36 }, founded: 2011 },
    'Orbit Freight': { headcount: [88, 89, 91, 92, 94, 95, 95, 97, 98, 99, 101, 103], openings: [2, 2, 3, 2, 3, 3, 2, 3, 3, 3, 4, 3], layoffs: null, careersPage: true, track: { posted: 11, filled: 9, medianDays: 44 }, founded: 2018 },
    'Nimbus Digital Group': { headcount: [null, null, null, null, null, null, null, null, null, null, null, 3], openings: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9], layoffs: null, careersPage: false, track: { posted: 9, filled: 0, medianDays: null }, founded: 2026, registeredDaysAgo: 19 },
  };

  // Where and when each listing appeared. posts: days ago, first is the original, the rest are reposts
  const postings = {
    'job-quokka': [{ p: 'seek', posts: [3], text: 'same' }, { p: 'linkedin', posts: [2], text: 'same' }, { p: 'workable', posts: [4], text: 'same' }],
    'job-tidal': [{ p: 'linkedin', posts: [6], text: 'same' }, { p: 'workable', posts: [7], text: 'same' }],
    'job-harvest': [{ p: 'seek', posts: [11], text: 'same' }, { p: 'workable', posts: [12], text: 'same' }],
    'job-medibank': [{ p: 'indeed', posts: [21], text: 'same' }, { p: 'seek', posts: [20], text: 'same' }, { p: 'workable', posts: [22], text: 'same' }],
    'job-dta': [{ p: 'apsjobs', posts: [29], text: 'same' }],
    'job-canva': [{ p: 'workable', posts: [35], text: 'same' }, { p: 'linkedin', posts: [33], text: 'same' }],
    'job-freight': [{ p: 'jora', posts: [148, 118, 87, 61, 33, 2], text: 'same' }, { p: 'seek', posts: [146, 90, 31], text: 'same' }, { p: 'indeed', posts: [140, 75, 9], text: 'salary' }, { p: 'linkedin', posts: [120, 44], text: 'same' }],
    'job-learn': [{ p: 'linkedin', posts: [96, 52, 2], text: 'same' }, { p: 'workable', posts: [97], text: 'evergreen' }],
    'job-kite': [{ p: 'seek', posts: [0.4], text: 'same' }, { p: 'workable', posts: [1], text: 'same' }],
    'job-orbit': [{ p: 'indeed', posts: [0.9], text: 'same' }, { p: 'seek', posts: [1], text: 'same' }],
    'job-nimbus': [{ p: 'indeed', posts: [5, 1], text: 'same' }, { p: 'jora', posts: [4], text: 'same' }],
  };

  // A suspicious listing so the check has something to catch
  const nimbusJob = {
    id: 'job-nimbus', title: 'Senior React Developer (Remote)', company: 'Nimbus Digital Group', location: 'Sydney NSW', mode: 'Remote', salary: '$230k – $260k', platform: 'indeed', hoursAgo: 26, sweep: 'sw-remote', domain: 'Fintech', score: 79, verdict: 'keep',
    parts: [0.9, 0.9, 1, 1, 0.6], keywords: ['React', 'TypeScript', 'Node.js', 'AWS'], missing: [],
    reason: 'Strong stack match and fully remote, with pay well above your floor. The ad is light on detail about the team and product.',
    blurb: 'Nimbus Digital Group is a fast-growing digital solutions company working with global clients.',
    reqs: ['Build web applications with React', 'Work with clients on exciting projects', 'Join a fast-paced dynamic team', '3+ years React experience', 'Excellent communication skills', 'Apply by messaging our hiring team on Telegram'],
    status: 'new',
  };

  // Ad-content findings per job (what a reader model would pull out of the ad)
  const content = {
    'job-freight': { specific: false, note: 'No team, manager or 90-day goals. Same wording as 5 other Linehaul ads.' },
    'job-learn': { specific: true, evergreen: true, note: 'Marked "evergreen" on their careers page: they collect applicants with no set start.' },
    'job-nimbus': { specific: false, scam: ['Asks you to apply by messaging on Telegram', 'Pay is 45% above the market rate for this role and level', 'Business name registered 19 days ago'], note: 'Generic text that could describe any company.' },
  };

  // People to contact, per job. degree: 1 = your connection, 2 = through a connection, 0 = no link yet
  const people = {
    'job-quokka': [
      { id: 'pp-alex', name: 'Alex Chen', role: 'Staff Engineer, Quokka Pay', how: 'Your connection. You worked together at Brightwater, 2022 to 2023.', degree: 1, ask: 'referral' },
      { id: 'pp-priya', name: 'Priya Raman', role: 'Engineering Manager, Merchant Experience', how: 'Named in the ad as the hiring manager.', degree: 2, via: 'Alex Chen', ask: 'note' },
      { id: 'pp-tom', name: 'Tom Lee', role: 'Talent Partner', how: 'Posted the ad on SEEK and LinkedIn.', degree: 0, ask: 'note' },
    ],
    'job-dta': [
      { id: 'pp-mei', name: 'Mei Hartono', role: 'Design System Lead', how: 'Named in the ad as the contact for questions. Dana worked with her in 2021.', degree: 2, via: 'Dana Okafor', ask: 'note' },
      { id: 'pp-dana', name: 'Dana Okafor', role: 'Engineering Manager, Brightwater Logistics', how: 'Your referee. Worked with Mei on the GOV.AU pattern library in 2021.', degree: 1, ask: 'intro', bridge: true },
      { id: 'pp-rhys', name: 'Rhys Taylor', role: 'Senior Frontend Developer', how: 'On the team page; speaks at the Canberra web meetup.', degree: 2, via: 'Dana Okafor', ask: 'note' },
    ],
  };

  // Resume experiments. One variable at a time; base counts are applications sent before this session
  const experiments = [
    { id: 'exp-summary', name: 'Summary angle', variable: 'summary', status: 'running', startedDaysAgo: 24, target: 20, next: 'A',
      variants: [
        { key: 'A', label: 'Skills-led', sample: 'Senior software engineer with 7 years in React, TypeScript and AWS, building logistics and fintech products.', sent: 10, replies: 3, interviews: 1 },
        { key: 'B', label: 'Impact-led', sample: 'Senior engineer who cut page load from 4.2s to 1.1s and AWS spend by 25%, and grew three graduates into service owners.', sent: 11, replies: 6, interviews: 4 },
      ] },
    { id: 'exp-pages', name: 'Page length', variable: 'pages', status: 'done', startedDaysAgo: 75, endedDaysAgo: 30, target: 15, winner: 'B',
      variants: [
        { key: 'A', label: '1 page', sample: 'Most recent two roles only, no portfolio.', sent: 15, replies: 3, interviews: 1 },
        { key: 'B', label: '2 pages', sample: 'All roles, portfolio and referees.', sent: 16, replies: 7, interviews: 5 },
      ] },
    { id: 'exp-cover', name: 'Cover letter', variable: 'cover', status: 'done', startedDaysAgo: 120, endedDaysAgo: 80, target: 15, winner: null,
      variants: [
        { key: 'A', label: 'With cover letter', sample: 'Three short paragraphs tied to the ad.', sent: 15, replies: 4, interviews: 2 },
        { key: 'B', label: 'Without', sample: 'Resume only.', sent: 15, replies: 4, interviews: 2 },
      ] },
  ];

  const experimentIdeas = [
    { variable: 'summary', name: 'Summary angle', a: 'Skills-led', b: 'Impact-led', aSample: 'Opens with your stack and years of experience.', bSample: 'Opens with two measurable results.' },
    { variable: 'lead', name: 'Skill you lead with', a: 'React first', b: 'Performance first', aSample: 'Skills section opens with React and TypeScript.', bSample: 'Skills section opens with web performance work.' },
    { variable: 'pages', name: 'Page length', a: '2 pages', b: '1 page', aSample: 'All roles, portfolio and referees.', bSample: 'Most recent two roles only.' },
    { variable: 'cover', name: 'Cover letter', a: 'With cover letter', b: 'Without', aSample: 'Three short paragraphs tied to the ad.', bSample: 'Resume only.' },
  ];

  return { companies, postings, nimbusJob, content, people, experiments, experimentIdeas, connectionsImported: 412 };
})();

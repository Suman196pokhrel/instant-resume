/* Mock data. Shapes loosely follow the entities in the MVP overview:
   KnowledgeBase > KbEntry (roles, portfolio, education, skills, credentials, referees) > Highlight,
   JobDescription > JobBrief, Project > Document > Section > SectionItem > Bullet, Theme, Revision, Connection. */

window.MOCK = (function () {
  const kb = {
    schemaVersion: 1,
    contact: {
      id: 'kb-contact',
      name: 'Jordan Whitlock',
      email: 'jordan.whitlock@example.com',
      phone: '0412 345 678',
      location: 'Sydney NSW',
      linkedin: 'linkedin.com/in/jordan-whitlock-example',
      github: 'github.com/jwhitlock-example',
    },
    workRights: {
      id: 'kb-rights',
      status: 'Australian citizen',
      notes: 'Eligible for Baseline security clearance',
      noticePeriod: '4 weeks',
    },
    roles: [
      {
        id: 'role-brightwater',
        title: 'Senior Software Engineer',
        company: 'Brightwater Logistics',
        location: 'Sydney NSW',
        start: 'Mar 2022',
        end: 'Present',
        highlights: [
          { id: 'hl-bw-1', text: 'Rebuilt the shipment tracking dashboard in React and TypeScript, cutting page load from 4.2s to 1.1s', metric: '4.2s to 1.1s load', skills: ['React', 'TypeScript', 'Performance'] },
          { id: 'hl-bw-2', text: 'Designed an event-driven pricing service on AWS Lambda and SQS that handles 2M quotes a month', metric: '2M quotes a month', skills: ['AWS', 'Node.js', 'Event-driven architecture'] },
          { id: 'hl-bw-3', text: 'Reduced AWS spend by 25% by right-sizing ECS services and adding autoscaling', metric: '25% lower AWS spend', skills: ['AWS', 'Terraform', 'Cost optimisation'] },
          { id: 'hl-bw-4', text: 'Introduced Playwright end-to-end tests, cutting production rollbacks from 6 to 1 per quarter', metric: '6 to 1 rollbacks a quarter', skills: ['Playwright', 'Testing', 'CI/CD'] },
          { id: 'hl-bw-5', text: 'Mentored three graduate engineers through their first year; two now own services end to end', metric: '3 graduates mentored', skills: ['Mentoring', 'Leadership'] },
          { id: 'hl-bw-6', text: 'Led the design system rollout across four product teams, with 60 shared components in Storybook', metric: '60 components, 4 teams', skills: ['Design systems', 'React', 'Accessibility'] },
        ],
      },
      {
        id: 'role-mosaic',
        title: 'Software Engineer',
        company: 'Mosaic Learning',
        location: 'Melbourne VIC',
        start: 'Feb 2019',
        end: 'Feb 2022',
        highlights: [
          { id: 'hl-mo-1', text: 'Built the assignment marking workflow used by 140 schools, in Node.js and PostgreSQL', metric: '140 schools', skills: ['Node.js', 'PostgreSQL'] },
          { id: 'hl-mo-2', text: 'Migrated a jQuery front end to React over nine months without a feature freeze', metric: '9-month migration', skills: ['React', 'JavaScript'] },
          { id: 'hl-mo-3', text: 'Cut API p95 latency from 900ms to 220ms with Redis caching and query indexes', metric: '900ms to 220ms p95', skills: ['Redis', 'PostgreSQL', 'Performance'] },
          { id: 'hl-mo-4', text: 'Ran fortnightly user interviews with teachers and turned findings into the product roadmap', metric: '', skills: ['User research', 'Product'] },
        ],
      },
      {
        id: 'role-civic',
        title: 'Graduate Developer',
        company: 'Civic Data Co-op',
        location: 'Sydney NSW',
        start: 'Feb 2018',
        end: 'Jan 2019',
        highlights: [
          { id: 'hl-cd-1', text: 'Fixed accessibility issues across the public data portal, bringing it to WCAG 2.1 AA', metric: 'WCAG 2.1 AA', skills: ['Accessibility', 'HTML', 'CSS'] },
          { id: 'hl-cd-2', text: 'Wrote Python ETL jobs that publish 30 council datasets each night', metric: '30 datasets nightly', skills: ['Python', 'SQL'] },
        ],
      },
    ],
    portfolio: [
      {
        id: 'pf-tidewatch',
        name: 'Tidewatch',
        summary: 'Open-source tide and swell forecast app for NSW beaches',
        link: 'github.com/jwhitlock-example/tidewatch',
        highlights: [
          { id: 'hl-tw-1', text: 'Offline-first PWA in React and TypeScript with 3,100 monthly users', metric: '3,100 monthly users', skills: ['React', 'TypeScript', 'PWA'] },
          { id: 'hl-tw-2', text: 'Processes Bureau of Meteorology feeds with a Go worker on Fly.io', metric: '', skills: ['Go'] },
        ],
      },
      {
        id: 'pf-ledgerline',
        name: 'Ledgerline',
        summary: 'Command-line tool for splitting shared household bills',
        link: 'github.com/jwhitlock-example/ledgerline',
        highlights: [
          { id: 'hl-ll-1', text: 'Go CLI with 400 GitHub stars and 12 outside contributors', metric: '400 stars', skills: ['Go', 'Open source'] },
        ],
      },
    ],
    education: [
      { id: 'ed-unsw', degree: 'Bachelor of Science (Computer Science)', institution: 'UNSW Sydney', year: '2017', notes: 'Distinction average; thesis on offline sync for mobile apps' },
    ],
    skills: [
      { id: 'sk-lang', group: 'Languages', items: ['TypeScript', 'JavaScript', 'Python', 'Go', 'SQL'] },
      { id: 'sk-fe', group: 'Frontend', items: ['React', 'Next.js', 'Tailwind CSS', 'Storybook', 'Playwright', 'Accessibility'] },
      { id: 'sk-be', group: 'Backend', items: ['Node.js', 'PostgreSQL', 'Redis', 'GraphQL', 'REST APIs'] },
      { id: 'sk-cloud', group: 'Cloud and tooling', items: ['AWS (Lambda, ECS, SQS)', 'Docker', 'Terraform', 'GitHub Actions'] },
    ],
    credentials: [
      { id: 'cr-aws', kind: 'Certification', title: 'AWS Certified Developer, Associate', issuer: 'Amazon Web Services', year: '2023' },
      { id: 'cr-award', kind: 'Award', title: 'Engineering Excellence Award', issuer: 'Brightwater Logistics', year: '2024' },
      { id: 'cr-talk', kind: 'Publication', title: 'Talk: Event-driven systems without the drama', issuer: 'SydJS', year: '2024' },
    ],
    referees: [
      { id: 'ref-dana', name: 'Dana Okafor', title: 'Engineering Manager', company: 'Brightwater Logistics', contact: 'dana.okafor@example.com' },
      { id: 'ref-sam', name: 'Sam Reyes', title: 'Head of Product', company: 'Mosaic Learning', contact: '0400 111 222' },
    ],
  };

  const jds = [
    {
      id: 'jd-harbourline',
      label: 'Harbourline, Senior Frontend Engineer',
      text: `Senior Frontend Engineer
Harbourline, Sydney NSW (hybrid, 3 days in office)

Harbourline builds payments software for Australian small businesses. We're looking for a Senior Frontend Engineer to join our Merchant Experience team.

What you'll do
- Build and maintain our merchant dashboard in React and TypeScript
- Own frontend performance and accessibility across the product
- Contribute to and grow our design system
- Mentor mid-level and junior engineers
- Work closely with product and design on discovery

About you
- 5+ years building production web applications
- Deep experience with React, TypeScript and modern CSS
- A track record of improving web performance
- Experience with automated testing (Playwright, Jest or similar)
- Comfortable with GraphQL and REST APIs

Nice to have
- Next.js experience
- Exposure to AWS
- Payments or fintech background

You must have full working rights in Australia.`,
      brief: {
        title: 'Senior Frontend Engineer',
        company: 'Harbourline',
        location: 'Sydney NSW, hybrid',
        team: 'Merchant Experience',
        requirements: ['5+ years building production web apps', 'React, TypeScript and modern CSS', 'Track record improving web performance', 'Automated testing (Playwright, Jest)', 'GraphQL and REST APIs', 'Mentoring engineers'],
        niceToHave: ['Next.js', 'AWS', 'Payments or fintech'],
        keywords: ['React', 'TypeScript', 'Performance', 'Accessibility', 'Design system', 'Mentoring', 'Playwright', 'Jest', 'GraphQL', 'REST', 'Next.js', 'AWS', 'Fintech'],
        workRights: 'Full working rights in Australia required',
      },
    },
    {
      id: 'jd-tessellate',
      label: 'Tessellate Health, Full Stack Engineer',
      text: `Full Stack Engineer
Tessellate Health, Melbourne VIC

Tessellate Health makes scheduling software for allied health clinics across Australia and New Zealand.

The role
- Ship features across our Node.js API and React web app
- Design PostgreSQL schemas and keep queries fast
- Improve reliability with monitoring and automated tests
- Talk to clinicians to understand their workflow

You'll bring
- 4+ years as a full stack engineer
- Node.js, TypeScript and React
- Strong SQL and PostgreSQL skills
- Experience with Redis or other caching
- Clear written communication

Bonus
- Docker and Terraform
- Healthcare or education products`,
      brief: {
        title: 'Full Stack Engineer',
        company: 'Tessellate Health',
        location: 'Melbourne VIC',
        team: 'Clinic Scheduling',
        requirements: ['4+ years full stack', 'Node.js, TypeScript and React', 'Strong SQL and PostgreSQL', 'Redis or other caching', 'Monitoring and automated tests', 'Clear written communication'],
        niceToHave: ['Docker', 'Terraform', 'Healthcare or education'],
        keywords: ['Node.js', 'TypeScript', 'React', 'PostgreSQL', 'SQL', 'Redis', 'Monitoring', 'Testing', 'Docker', 'Terraform', 'User research'],
        workRights: 'Not stated',
      },
    },
    {
      id: 'jd-southerly',
      label: 'Southerly Energy, Platform Engineer',
      text: `Software Engineer, Platform
Southerly Energy, Sydney NSW

Help us build the platform behind Australia's fastest-growing community battery network.

Responsibilities
- Build event-driven services on AWS (Lambda, SQS, EventBridge)
- Manage infrastructure as code with Terraform
- Improve CI/CD pipelines in GitHub Actions
- Keep our cloud costs under control

Requirements
- 3+ years in backend or platform engineering
- AWS, Terraform and Docker
- Python or Go
- Experience with Kubernetes

Nice to have
- Energy sector experience`,
      brief: {
        title: 'Software Engineer, Platform',
        company: 'Southerly Energy',
        location: 'Sydney NSW',
        team: 'Platform',
        requirements: ['3+ years backend or platform', 'AWS, Terraform and Docker', 'Python or Go', 'Kubernetes experience'],
        niceToHave: ['Energy sector'],
        keywords: ['AWS', 'Lambda', 'SQS', 'Event-driven', 'Terraform', 'Docker', 'CI/CD', 'GitHub Actions', 'Python', 'Go', 'Kubernetes', 'Cost'],
        workRights: 'Not stated',
      },
    },
    {
      id: 'jd-lumen',
      label: 'Lumen Rail, Senior Full Stack Engineer',
      text: `Senior Full Stack Engineer
Lumen Rail, Sydney NSW (remote within Australia)

Lumen Rail builds passenger information systems for rail operators in NSW and Victoria.

What you'll work on
- Real-time departure boards in React and TypeScript
- Node.js services that process live train positions
- Accessibility for passengers using screen readers
- Leading technical design for new features

What we're looking for
- 6+ years of software engineering experience
- React, TypeScript, Node.js
- Event-driven or real-time systems
- WCAG accessibility experience
- Mentoring and technical leadership

Nice to have
- AWS
- Public transport or government experience`,
      brief: {
        title: 'Senior Full Stack Engineer',
        company: 'Lumen Rail',
        location: 'Sydney NSW, remote in Australia',
        team: 'Passenger Information',
        requirements: ['6+ years software engineering', 'React, TypeScript, Node.js', 'Event-driven or real-time systems', 'WCAG accessibility', 'Mentoring and technical leadership'],
        niceToHave: ['AWS', 'Public transport or government'],
        keywords: ['React', 'TypeScript', 'Node.js', 'Real-time', 'Event-driven', 'Accessibility', 'WCAG', 'Mentoring', 'Leadership', 'AWS', 'Government'],
        workRights: 'Not stated',
      },
    },
    {
      id: 'jd-mintleaf',
      label: 'Mintleaf, Senior Full Stack Engineer',
      text: `Senior Full Stack Engineer
Mintleaf, Melbourne VIC (hybrid, 2 days in office)

Mintleaf builds invoicing and cash-flow tools for Australian tradespeople. We're a team of 40 and growing.

What you'll do
- Build features across our React and TypeScript web app and Node.js APIs
- Design PostgreSQL schemas and keep queries fast
- Own the performance and reliability of services on AWS
- Write automated tests and improve our CI pipeline
- Mentor engineers and lead technical design

About you
- 5+ years building production web applications
- React, TypeScript and Node.js
- Strong SQL and PostgreSQL
- AWS in production
- Mentoring and technical leadership

Nice to have
- GraphQL
- Terraform
- Accessibility experience

Full working rights in Australia are required.`,
      brief: {
        title: 'Senior Full Stack Engineer',
        company: 'Mintleaf',
        location: 'Melbourne VIC, hybrid',
        team: 'Product Engineering',
        seniority: 'Senior',
        requirements: ['5+ years building web apps', 'React, TypeScript and Node.js', 'Strong SQL and PostgreSQL', 'AWS in production', 'Mentoring and technical leadership'],
        niceToHave: ['GraphQL', 'Terraform', 'Accessibility'],
        keywords: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'SQL', 'AWS', 'Performance', 'Testing', 'Mentoring', 'GraphQL', 'Terraform', 'Accessibility'],
        workRights: 'Full working rights in Australia required',
      },
    },
  ];

  const providers = [
    { id: 'anthropic', name: 'Anthropic', prefix: 'sk-ant-', keyUrl: 'https://console.anthropic.com/settings/keys', models: ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'] },
    { id: 'openai', name: 'OpenAI', prefix: 'sk-', keyUrl: 'https://platform.openai.com/api-keys', models: ['gpt-5.2', 'gpt-5.2-mini'] },
    { id: 'gemini', name: 'Gemini', prefix: 'AIza', keyUrl: 'https://aistudio.google.com/apikey', models: ['gemini-3-pro', 'gemini-3-flash'] },
  ];

  // A real product would keep this list in the rules engine config.
  const bannedPhrases = ['passionate', 'results-driven', 'synergy', 'leverage', 'spearheaded', 'dynamic', 'team player', 'proven track record', 'fast-paced', 'go-getter', 'delve', 'tapestry', 'thrilled', 'cutting-edge', 'utilise'];

  const themeDefaults = {
    font: 'Liberation Sans',
    baseSize: 10.5,
    headingSize: 12,
    nameSize: 22,
    margin: 18,
    lineHeight: 1.35,
    sectionGap: 12,
    accent: '#0E7466',
  };

  const accents = ['#0E7466', '#1F4E8C', '#7A2E5C', '#8A4B12', '#2E2E2E'];

  // Default themes for Quick generate (Settings > Quick generate defaults)
  const themePresets = {
    classic: { label: 'Classic', ...themeDefaults },
    modern: { label: 'Modern', font: 'Inter', baseSize: 10, headingSize: 12, nameSize: 24, margin: 16, lineHeight: 1.4, sectionGap: 14, accent: '#1F4E8C' },
    compact: { label: 'Compact', font: 'Carlito', baseSize: 10, headingSize: 11, nameSize: 18, margin: 12, lineHeight: 1.25, sectionGap: 8, accent: '#2E2E2E' },
  };

  return { kb, jds, providers, bannedPhrases, themeDefaults, themePresets, accents };
})();

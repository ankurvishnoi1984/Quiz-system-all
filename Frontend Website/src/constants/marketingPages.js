export const NAV_ITEMS = [
  { to: '/features', label: 'Features' },
  { to: '/solutions', label: 'Solutions' },
  { to: '/use-cases', label: 'Use cases' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/resources', label: 'Resources' },
  { to: '/contact', label: 'Contact' },
]

export const FOOTER_PRODUCT_LINKS = [
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/product-tour', label: 'Product tour' },
  { to: '/integrations', label: 'Integrations' },
  { to: '/pricing', label: 'Pricing' },
]

export const FOOTER_SOLUTION_LINKS = [
  { to: '/solutions', label: 'Solutions overview' },
  { to: '/use-cases', label: 'Use cases' },
  { to: '/enterprise', label: 'Enterprise' },
  { to: '/stories', label: 'Customer stories' },
]

export const FOOTER_RESOURCE_LINKS = [
  { to: '/resources', label: 'Resource hub' },
  { to: '/faq', label: 'FAQ' },
  { to: '/security', label: 'Security & trust' },
  { to: '/help', label: 'Help center' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export const FOOTER_LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/terms', label: 'Terms of use' },
]

export const USE_CASE_PAGES = [
  {
    slug: 'training',
    title: 'Corporate training',
    headline: 'Turn training into measurable learning',
    description:
      'Run knowledge checks during workshops, track who participated, and export results for L&D reporting.',
    audience: 'L&D teams, HR, facilitators',
    highlights: ['Live knowledge checks', 'Team comparisons', 'Exportable session reports'],
    longCopy: [
      'Training only works when people stay engaged. High Voltage lets facilitators insert quizzes and polls at the right moments — without leaving the flow of the session.',
      'After the workshop, export participation and scores so L&D teams can prove what landed and what needs a follow-up.',
    ],
  },
  {
    slug: 'education',
    title: 'Classrooms & workshops',
    headline: 'Keep every learner involved',
    description:
      'Check understanding in real time, run icebreakers, and keep hybrid classrooms aligned from phone to projector.',
    audience: 'Educators, trainers, coaches',
    highlights: ['Instant comprehension checks', 'Mobile-friendly join', 'Present mode for the board'],
    longCopy: [
      'Large rooms and hybrid cohorts make it hard to know who is keeping up. Live questions give every learner a voice — including the quiet ones at the back.',
      'Present mode keeps the board or projector focused while responses stream in from phones and laptops.',
    ],
  },
  {
    slug: 'meetings',
    title: 'Meetings & town halls',
    headline: 'Give large audiences a voice',
    description:
      'Open the floor with live polls and feedback while leadership presents — in-room or remote.',
    audience: 'Leadership, internal comms',
    highlights: ['Anonymous feedback options', 'Live charts on screen', 'Works for hybrid audiences'],
    longCopy: [
      'Town halls often become one-way broadcasts. Polls and Q&A-style interactions make them two-way without slowing the agenda.',
      'Anonymous options encourage honest feedback when topics are sensitive.',
    ],
  },
  {
    slug: 'events',
    title: 'Conferences & events',
    headline: 'Stage-ready audience engagement',
    description:
      'Brand the session, share a QR join code, and deliver a polished experience from stage to every seat.',
    audience: 'Event agencies, MCs, speakers',
    highlights: ['Session branding', 'QR join codes', 'Leaderboards for energy'],
    longCopy: [
      'From keynotes to breakout rooms, High Voltage helps MCs keep energy high with quizzes, polls, and on-screen results.',
      'Brand the join experience so the session feels like part of the event — not a bolted-on tool.',
    ],
  },
]

export const STORY_ITEMS = [
  {
    sector: 'Learning & development',
    title: 'Faster feedback loops in leadership workshops',
    quote:
      'We stopped guessing whether the room understood the content. Live quizzes showed gaps in the moment — and reports went straight to stakeholders.',
    outcome: 'Higher completion visibility across cohorts',
  },
  {
    sector: 'Higher education',
    title: 'Hybrid lectures that still feel interactive',
    quote:
      'Students join from any device. Present mode keeps the lecture hall focused while polls run in the background.',
    outcome: 'Stronger participation in large cohorts',
  },
  {
    sector: 'Internal events',
    title: 'Town halls that capture every voice',
    quote:
      'Anonymous polls made people more honest. We used the results the same day to adjust the agenda.',
    outcome: 'Clearer employee sentiment in minutes',
  },
  {
    sector: 'Conference production',
    title: 'Breakouts that feel as polished as the main stage',
    quote:
      'QR join and branded present mode meant every room looked consistent. Speakers focused on content instead of tech setup.',
    outcome: 'Faster session starts across parallel rooms',
  },
  {
    sector: 'Corporate onboarding',
    title: 'Onboarding cohorts with measurable checkpoints',
    quote:
      'We run the same quiz pack for every new-hire week. Scores and attendance exports make HR reporting painless.',
    outcome: 'Standardized onboarding quality checks',
  },
  {
    sector: 'Sales enablement',
    title: 'Product training that sticks',
    quote:
      'Timed quizzes after demos keep the team sharp. Leaderboards add healthy competition without extra tools.',
    outcome: 'Better product knowledge retention',
  },
]

export const RESOURCE_ITEMS = [
  {
    title: 'Getting started guide',
    description: 'Create an account, pick a plan, and run your first live session in under 15 minutes.',
    href: '/how-it-works',
    tag: 'Guide',
  },
  {
    title: 'Product tour',
    description: 'Walk through host portal, participant join, present mode, and reporting.',
    href: '/product-tour',
    tag: 'Product',
  },
  {
    title: 'Security & trust',
    description: 'How we approach authentication, access control, and operational reliability.',
    href: '/security',
    tag: 'Trust',
  },
  {
    title: 'Integrations roadmap',
    description: 'See how High Voltage fits beside the tools your teams already use.',
    href: '/integrations',
    tag: 'Platform',
  },
  {
    title: 'Pricing & participant limits',
    description: 'Understand concurrent participant capacity and how seats free when people disconnect.',
    href: '/pricing',
    tag: 'Plans',
  },
  {
    title: 'Enterprise buying guide',
    description: 'Roles, departments, plans, and admin controls for larger organizations.',
    href: '/enterprise',
    tag: 'Enterprise',
  },
  {
    title: 'FAQ',
    description: 'Answers about join links, branding, multi-session usage, and administration.',
    href: '/faq',
    tag: 'Support',
  },
  {
    title: 'Help center',
    description: 'Support channels, common fixes, and how to reach the team quickly.',
    href: '/help',
    tag: 'Support',
  },
]

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Choose capacity',
    detail:
      'Pick a plan based on how many participants can be connected at the same time during your live events.',
  },
  {
    step: '02',
    title: 'Register your organization',
    detail:
      'Create a host account with company details. Your workspace is provisioned automatically after signup.',
  },
  {
    step: '03',
    title: 'Build the session',
    detail:
      'Add quizzes, polls, and surveys in the session builder. Configure timers, branding, and join rules.',
  },
  {
    step: '04',
    title: 'Share the join link',
    detail:
      'Participants join from any modern browser with a link or QR code — no app install required.',
  },
  {
    step: '05',
    title: 'Present live',
    detail:
      'Use present mode on the big screen, reveal answers, and keep leaderboards or charts updating in real time.',
  },
  {
    step: '06',
    title: 'Export results',
    detail:
      'Review participation and accuracy, then download PDF or Excel reports for stakeholders.',
  },
]

export const TOUR_SECTIONS = [
  {
    title: 'Host dashboard',
    body: 'See upcoming sessions, capacity usage, and quick actions to create or resume events.',
    points: ['Session list & status', 'Plan capacity snapshot', 'Shortcuts to builder and live controls'],
  },
  {
    title: 'Session builder',
    body: 'Assemble question sets with scoring rules, timers, and branding before you go live.',
    points: ['Multiple question types', 'Reorder & preview', 'Session logo and join settings'],
  },
  {
    title: 'Participant join',
    body: 'Attendees enter a code or open a link. Optional OTP and allowlists help you control access.',
    points: ['Browser-based join', 'Optional identity capture', 'Disconnect frees capacity'],
  },
  {
    title: 'Present mode',
    body: 'A full-screen experience for projectors and confidence monitors with QR join and live visuals.',
    points: ['Stage-ready layout', 'Leaderboard overlays', 'Keyboard-friendly navigation'],
  },
  {
    title: 'Live operations',
    body: 'Activate questions, lock the room when needed, and watch responses arrive as they happen.',
    points: ['Live progress', 'Room lock controls', 'Realtime updates over WebSocket'],
  },
  {
    title: 'Analytics & exports',
    body: 'After the session, dig into rankings and question performance, then share polished reports.',
    points: ['Participation metrics', 'PDF & Excel export', 'Department-friendly summaries'],
  },
]

export const SECURITY_PILLARS = [
  {
    title: 'Authenticated host access',
    body: 'Hosts and admins sign in with secured authentication. Role-based rights control who can build, present, or administer.',
  },
  {
    title: 'Participant session tokens',
    body: 'Participants receive scoped tokens after joining a session code — limiting what they can access outside that live context.',
  },
  {
    title: 'Operational controls',
    body: 'Room lock, rate limits, and IP blocking tools help hosts and operators manage abuse during high-traffic events.',
  },
  {
    title: 'Data ownership mindset',
    body: 'Session content, responses, and reports stay inside your organization workspace for review and export.',
  },
]

export const INTEGRATION_ITEMS = [
  {
    title: 'Browser-first join',
    body: 'Works alongside Zoom, Teams, Google Meet, and Webex — participants join in a browser tab while the meeting continues.',
  },
  {
    title: 'QR & link sharing',
    body: 'Drop join links into slides, chat, or digital signage. QR codes make in-room joining fast.',
  },
  {
    title: 'Exports for your stack',
    body: 'PDF and Excel exports plug into the reporting tools your L&D, HR, or academic teams already use.',
  },
  {
    title: 'Email & SMS OTP',
    body: 'Optional verification flows help confirm participant identity when your event requires it.',
  },
  {
    title: 'Admin portal separation',
    body: 'Marketing site and host portal stay separate so operations can evolve without slowing public pages.',
  },
  {
    title: 'Roadmap openness',
    body: 'Need a specific LMS or calendar connector? Talk to us — enterprise conversations help prioritize integrations.',
  },
]

export const SOLUTION_PILLARS = [
  {
    title: 'For education',
    body: 'Lectures, tutorials, and workshops that need instant checks for understanding — including hybrid cohorts.',
    href: '/use-cases#education',
    points: ['Fast join on student devices', 'Present mode for lecture halls', 'Exports for assessment evidence'],
  },
  {
    title: 'For business training',
    body: 'Onboarding, product enablement, and compliance refreshers with measurable live checkpoints.',
    href: '/use-cases#training',
    points: ['Reusable quiz packs', 'Leaderboards for energy', 'Capacity plans for peak cohorts'],
  },
  {
    title: 'For internal communications',
    body: 'Town halls and all-hands that collect honest feedback without turning into a free-for-all chat.',
    href: '/use-cases#meetings',
    points: ['Anonymous polling options', 'Live charts on screen', 'Same-day sentiment insights'],
  },
  {
    title: 'For events',
    body: 'Conferences and hybrid events that need branded, stage-ready engagement across rooms.',
    href: '/use-cases#events',
    points: ['Session branding', 'QR join at scale', 'Consistent present experience'],
  },
]

export const ENTERPRISE_POINTS = [
  {
    title: 'Organization structure',
    body: 'Clients, departments, and roles let larger teams separate ownership while sharing a platform.',
  },
  {
    title: 'Plan & seat administration',
    body: 'Super admins can assign plans, grant extra concurrent seats, and activate or deactivate accounts.',
  },
  {
    title: 'Shared capacity model',
    body: 'Concurrent participant limits apply across live sessions — ideal for organizations running multiple events.',
  },
  {
    title: 'Reporting for stakeholders',
    body: 'Exportable session outcomes help training, HR, and leadership teams close the loop after events.',
  },
  {
    title: 'Guided onboarding',
    body: 'Enterprise rollouts can include a walkthrough of host portal workflows and present-mode best practices.',
  },
  {
    title: 'Direct support path',
    body: 'Talk to the High Voltage team for sizing, demos, and procurement questions.',
  },
]

export const HELP_TOPICS = [
  {
    title: 'I cannot join a session',
    body: 'Confirm the session code, check that the host has started the session, and retry on a modern browser. If the room is locked, wait for the host to reopen joining.',
  },
  {
    title: 'Host portal login issues',
    body: 'Use the host portal login page and the forgot-password flow if needed. Clear browser cache or try an incognito window if a stale session interferes.',
  },
  {
    title: 'Participant limit reached',
    body: 'Your plan caps concurrent connections. When someone disconnects, a seat frees. Upgrade or request extra seats for peak events.',
  },
  {
    title: 'Reports and exports',
    body: 'Open the completed session in the host portal to view rankings and download PDF or Excel reports.',
  },
  {
    title: 'Branding & present mode',
    body: 'Upload a session logo in session settings and open present mode on the display machine before going live.',
  },
  {
    title: 'Talk to a human',
    body: 'Email support with your organization name, session code (if relevant), and screenshots for faster help.',
  },
]

export const HOME_CONTENT_BLOCKS = [
  {
    title: 'Why facilitators switch',
    body: 'Generic slide polls are not enough when you need quizzes, leaderboards, branding, and exports in one workflow.',
    points: [
      'One host portal for build → present → report',
      'Plans sized for concurrent live audiences',
      'Works for in-room, hybrid, and remote groups',
    ],
  },
  {
    title: 'What participants experience',
    body: 'No downloads. A clean join flow. Clear questions and live feedback that keeps attention on the room.',
    points: [
      'Join by link or QR on any modern browser',
      'Optional identity or OTP when required',
      'Mobile-friendly layout during live questions',
    ],
  },
]

export const TIP_ARTICLES = [
  {
    slug: 'first-live-quiz',
    title: 'How to run your first live quiz in 15 minutes',
    summary: 'A practical checklist from plan selection to present mode.',
    href: '/how-it-works',
  },
  {
    slug: 'hybrid-townhall',
    title: 'Hybrid town hall playbook',
    summary: 'Keep remote and in-room staff equally involved with polls and clear present visuals.',
    href: '/use-cases#meetings',
  },
  {
    slug: 'capacity-planning',
    title: 'Sizing concurrent participant capacity',
    summary: 'How shared live seats work when multiple sessions run at once.',
    href: '/pricing',
  },
]

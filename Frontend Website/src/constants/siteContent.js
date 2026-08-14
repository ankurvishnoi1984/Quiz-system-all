export const SITE_NAME = 'High Voltage'

/** @deprecated Prefer getPlanDisplayPrice(plan) with API plan objects that include price_monthly. */
export const PLAN_DISPLAY_PRICES = {
  Starter: { monthly: 999, currency: 'INR', label: '₹999', period: '/month' },
  Standard: { monthly: 2499, currency: 'INR', label: '₹2,499', period: '/month' },
  Professional: { monthly: 5999, currency: 'INR', label: '₹5,999', period: '/month' },
  Enterprise: { monthly: 14999, currency: 'INR', label: '₹14,999', period: '/month' },
}

function formatCurrencyLabel(amount, currency = 'INR') {
  const value = Number(amount)
  if (!Number.isFinite(value) || value < 0) return null
  const code = String(currency || 'INR').toUpperCase()
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${code} ${value.toLocaleString('en-IN')}`
  }
}

/**
 * Resolve display price from a DB plan object (preferred) or legacy plan name string.
 */
export function getPlanDisplayPrice(planOrName) {
  if (planOrName && typeof planOrName === 'object') {
    const monthly =
      planOrName.price_monthly != null && planOrName.price_monthly !== ''
        ? Number(planOrName.price_monthly)
        : null
    const currency = planOrName.currency || 'INR'
    if (Number.isFinite(monthly) && monthly >= 0) {
      return {
        monthly,
        currency,
        label: planOrName.price_label || formatCurrencyLabel(monthly, currency) || 'Custom',
        period: '/month',
      }
    }
    return {
      monthly: null,
      currency,
      label: 'Custom',
      period: '',
    }
  }

  return (
    PLAN_DISPLAY_PRICES[planOrName] || {
      monthly: null,
      currency: 'INR',
      label: 'Custom',
      period: '',
    }
  )
}

/** Human-readable concurrent participant cap from plan max_participants. */
export function formatPlanParticipantLimit(maxParticipants) {
  const count = Number(maxParticipants)
  if (!Number.isFinite(count) || count <= 0) return 'Custom participant limit'
  return `${count.toLocaleString()} participants connected at the same time`
}

export function formatPlanParticipantLimitShort(maxParticipants) {
  const count = Number(maxParticipants)
  if (!Number.isFinite(count) || count <= 0) return 'Custom limit'
  return `${count.toLocaleString()} at a time`
}

export const HERO_STATS = [
  { value: 'Live', label: 'Concurrent participant limits' },
  { value: 'Real-time', label: 'Live results & leaderboards' },
  { value: '5 min', label: 'Average setup time' },
  { value: '99.9%', label: 'Platform uptime target' },
]

export const CORE_FEATURES = [
  {
    title: 'Live quizzes & scoring',
    description:
      'Run timed multiple-choice quizzes with automatic scoring, answer reveal, and per-question leaderboards that keep competition fair and exciting.',
    highlights: ['Timed questions', 'Negative marking options', 'Instant scoring'],
  },
  {
    title: 'Polls & word clouds',
    description:
      'Capture opinions in seconds with single or multi-select polls, rating scales, and collaborative word clouds that visualize audience sentiment.',
    highlights: ['Anonymous responses', 'Live chart updates', 'Emoji reactions'],
  },
  {
    title: 'Present mode',
    description:
      'A full-screen presenter experience with join QR codes, session branding, slide navigation, and audience-facing visuals designed for projectors.',
    highlights: ['Custom session logos', 'QR join codes', 'Keyboard shortcuts'],
  },
  {
    title: 'Leaderboards & rankings',
    description:
      'Display live and overall leaderboards during sessions. Keep audiences competitive with per-question and session-wide scoring.',
    highlights: ['Live leaderboard', 'Question rankings', 'Present mode display'],
  },
  {
    title: 'Analytics & exports',
    description:
      'Review participation rates, accuracy, rankings, and per-question breakdowns. Export reports to PDF and Excel for stakeholders.',
    highlights: ['Session summaries', 'Department analytics', 'Downloadable reports'],
  },
  {
    title: 'Concurrent participant limits',
    description:
      'Your plan sets how many participants can be connected at the same time across your live sessions. When someone leaves, that slot opens for a new joiner.',
    highlights: ['Live connection counting', 'Extra seat add-ons', 'Usage dashboard in host portal'],
  },
]

export const USE_CASES = [
  {
    title: 'Corporate training',
    description: 'Reinforce learning with knowledge checks, track completion, and compare teams across departments.',
    audience: 'L&D teams, HR, facilitators',
  },
  {
    title: 'Town halls & all-hands',
    description: 'Open the floor with live polls and instant feedback while keeping large audiences engaged remotely or in-room.',
    audience: 'Leadership, internal comms',
  },
  {
    title: 'Classrooms & workshops',
    description: 'Check understanding in real time, run icebreakers, and maintain attention in hybrid teaching environments.',
    audience: 'Educators, trainers, coaches',
  },
  {
    title: 'Conferences & events',
    description: 'Brand your session, display sponsor logos, and deliver a polished audience experience from stage to mobile.',
    audience: 'Event agencies, MCs, speakers',
  },
]

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Choose your plan',
    description: 'Pick how many participants can be connected at once during your live events. Upgrade when your audience grows.',
  },
  {
    step: '02',
    title: 'Create your account',
    description: 'Register with your organization details. Your host workspace is provisioned automatically.',
  },
  {
    step: '03',
    title: 'Build a session',
    description: 'Use the session builder to add questions, configure timing, branding, and join settings.',
  },
  {
    step: '04',
    title: 'Go live',
    description: 'Share the join link or QR code, present on the big screen, and watch responses roll in live.',
  },
]

export const TRUST_POINTS = [
  'Role-based host portal with secure authentication',
  'Participant join links work on any modern browser',
  'Designed for in-room, hybrid, and fully remote audiences',
  'Plans limit concurrent live connections — capacity frees up when participants disconnect',
  'Demo checkout available today — card and UPI flows are simulated until live gateway integration',
]

export const FAQ_ITEMS = [
  {
    question: 'How does participant limiting work?',
    answer:
      'Your plan limits how many participants can have an active live connection at the same time across all of your sessions — for example, a 50-participant plan means up to 50 people can be connected at once. When a participant closes their browser or disconnects, that slot becomes available again. Track connected vs remaining capacity on the My Plan page in the host portal.',
  },
  {
    question: 'Can I run multiple sessions at once?',
    answer:
      'Yes. Your plan allowance is shared across all live sessions on your account. If you run two sessions simultaneously, both draw from the same concurrent participant pool until people disconnect.',
  },
  {
    question: 'Do participants need to install an app?',
    answer:
      'No. Participants join from a browser using a link or QR code. No downloads or accounts are required for attendees.',
  },
  {
    question: 'Can I brand sessions for my organization?',
    answer:
      'Yes. Upload a session logo, use present mode for full-screen visuals, and configure join experiences that match your event identity.',
  },
  {
    question: 'Is payment required today?',
    answer:
      'Not yet. Select a plan during registration and your account is activated immediately. Online billing will be added in a future release.',
  },
  {
    question: 'Where do I manage sessions after signing up?',
    answer:
      'After registration you are redirected to the host admin portal — a separate application where you build sessions, run live events, and view analytics.',
  },
  {
    question: 'Can super admins manage plans and users?',
    answer:
      'Yes. Platform administrators can create plans, assign them to users, grant extra concurrent participant seats, and activate or deactivate accounts from the admin portal.',
  },
]

/* Static comparison kept for reference; PricingPage now builds columns from API plans.
export const COMPARISON_ROWS = [
  { feature: 'Live quizzes & polls', starter: true, standard: true, professional: true, enterprise: true },
  { feature: 'Present mode', starter: true, standard: true, professional: true, enterprise: true },
  { feature: 'Leaderboards', starter: true, standard: true, professional: true, enterprise: true },
  { feature: 'Analytics & reports', starter: true, standard: true, professional: true, enterprise: true },
  { feature: 'Session branding', starter: true, standard: true, professional: true, enterprise: true },
  { feature: 'Priority support', starter: false, standard: false, professional: true, enterprise: true },
  { feature: 'Dedicated onboarding', starter: false, standard: false, professional: false, enterprise: true },
]
*/
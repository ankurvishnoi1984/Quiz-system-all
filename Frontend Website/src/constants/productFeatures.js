/**
 * Plain-language product features + which plan tier unlocks them.
 * Tier order: 0 Starter → 1 Standard → 2 Professional → 3 Enterprise
 */

export const PLAN_TIER_META = [
  {
    id: 'starter',
    order: 0,
    match: [/starter/i, /basic/i, /free/i],
    whoFor: 'Small classes, team huddles, and first-time hosts',
    summary: 'Everything you need to run a live quiz or poll with a smaller audience.',
  },
  {
    id: 'standard',
    order: 1,
    match: [/standard/i, /plus/i, /growth/i],
    whoFor: 'Regular training rooms and weekly workshops',
    summary: 'More people online at once, plus stronger reporting for recurring sessions.',
  },
  {
    id: 'professional',
    order: 2,
    match: [/professional/i, /pro/i, /business/i],
    whoFor: 'Large events, multi-host teams, and frequent live sessions',
    summary: 'Higher capacity, more team seats, and advanced controls for busy hosts.',
  },
  {
    id: 'enterprise',
    order: 3,
    match: [/enterprise/i, /custom/i, /organization/i],
    whoFor: 'Companies and institutions that need scale and admin control',
    summary: 'Biggest audiences, organization tools, and priority support options.',
  },
]

/** @type {{ id: string, title: string, plain: string, category: string, minTier: number }[]} */
export const PRODUCT_FEATURES = [
  {
    id: 'live-quiz',
    title: 'Live quizzes',
    plain: 'Ask questions while everyone is online and score answers automatically.',
    category: 'Engage your audience',
    minTier: 0,
  },
  {
    id: 'polls',
    title: 'Live polls',
    plain: 'Collect opinions in seconds and show results on the big screen.',
    category: 'Engage your audience',
    minTier: 0,
  },
  {
    id: 'word-cloud',
    title: 'Word clouds',
    plain: 'See popular words from the room appear live as people respond.',
    category: 'Engage your audience',
    minTier: 0,
  },
  {
    id: 'surveys',
    title: 'Surveys',
    plain: 'Gather feedback at a comfortable pace — not only during a live race.',
    category: 'Engage your audience',
    minTier: 0,
  },
  {
    id: 'join-link',
    title: 'Easy join (link or QR)',
    plain: 'People join from their phone or laptop — no app install needed.',
    category: 'Run the session',
    minTier: 0,
  },
  {
    id: 'present-mode',
    title: 'Present mode',
    plain: 'A full-screen view for projectors with join info and live results.',
    category: 'Run the session',
    minTier: 0,
  },
  {
    id: 'session-builder',
    title: 'Session builder',
    plain: 'Prepare questions, timers, and branding before you go live.',
    category: 'Run the session',
    minTier: 0,
  },
  {
    id: 'timers',
    title: 'Timers & scoring rules',
    plain: 'Set time limits and scoring so quizzes feel fair and exciting.',
    category: 'Run the session',
    minTier: 0,
  },
  {
    id: 'leaderboard',
    title: 'Live leaderboards',
    plain: 'Show rankings during the session to keep energy high.',
    category: 'Results & motivation',
    minTier: 0,
  },
  {
    id: 'basic-reports',
    title: 'Session summary',
    plain: 'After the event, see who joined and how they answered.',
    category: 'Results & motivation',
    minTier: 0,
  },
  {
    id: 'exports',
    title: 'PDF & Excel exports',
    plain: 'Download reports to share with managers, teachers, or clients.',
    category: 'Results & motivation',
    minTier: 1,
  },
  {
    id: 'branding',
    title: 'Session branding',
    plain: 'Add your logo so the join screen and present view look like your event.',
    category: 'Look & control',
    minTier: 1,
  },
  {
    id: 'room-lock',
    title: 'Lock the room',
    plain: 'Stop new people from joining once your session has started.',
    category: 'Look & control',
    minTier: 1,
  },
  {
    id: 'otp-join',
    title: 'OTP / verified join',
    plain: 'Ask people to verify by email or SMS when you need tighter access.',
    category: 'Look & control',
    minTier: 2,
  },
  {
    id: 'team-seats',
    title: 'Team member seats',
    plain: 'Let colleagues host their own sessions under one subscription.',
    category: 'Team & organization',
    minTier: 1,
  },
  {
    id: 'departments',
    title: 'Departments & roles',
    plain: 'Organize hosts by team and control who can build or present.',
    category: 'Team & organization',
    minTier: 2,
  },
  {
    id: 'admin-console',
    title: 'Admin controls',
    plain: 'Assign plans, manage users, and oversee capacity from one place.',
    category: 'Team & organization',
    minTier: 3,
  },
  {
    id: 'priority-support',
    title: 'Priority support',
    plain: 'Faster help when you are preparing an important live event.',
    category: 'Support',
    minTier: 2,
  },
  {
    id: 'onboarding',
    title: 'Guided onboarding',
    plain: 'A walkthrough with our team so your first big session goes smoothly.',
    category: 'Support',
    minTier: 3,
  },
]

export const FEATURE_CATEGORIES = [
  'Engage your audience',
  'Run the session',
  'Results & motivation',
  'Look & control',
  'Team & organization',
  'Support',
]

export function resolvePlanTier(plans = []) {
  const sorted = [...plans].sort(
    (a, b) => Number(a.max_participants || 0) - Number(b.max_participants || 0)
  )

  return plans.map((plan) => {
    const name = String(plan.name || '')
    const byName = PLAN_TIER_META.find((tier) => tier.match.some((re) => re.test(name)))
    if (byName) return { ...plan, tierId: byName.id, tierOrder: byName.order, tierMeta: byName }

    const rank = Math.max(
      0,
      Math.min(PLAN_TIER_META.length - 1, sorted.findIndex((p) => p.plan_id === plan.plan_id))
    )
    const tierMeta = PLAN_TIER_META[rank] || PLAN_TIER_META[0]
    return { ...plan, tierId: tierMeta.id, tierOrder: tierMeta.order, tierMeta }
  })
}

export function planHasFeature(planWithTier, feature) {
  const order = Number(planWithTier?.tierOrder ?? 0)
  return order >= Number(feature.minTier || 0)
}

export function featuresForPlan(planWithTier) {
  return PRODUCT_FEATURES.filter((feature) => planHasFeature(planWithTier, feature))
}

export function featuresGrouped() {
  return FEATURE_CATEGORIES.map((category) => ({
    category,
    features: PRODUCT_FEATURES.filter((f) => f.category === category),
  })).filter((group) => group.features.length)
}

/** Short bullets for pricing cards (capacity + top features). */
export function planCardHighlights(planWithTier) {
  const unlocked = featuresForPlan(planWithTier)
  const priorityIds = [
    'live-quiz',
    'polls',
    'present-mode',
    'join-link',
    'leaderboard',
    'exports',
    'branding',
    'team-seats',
    'departments',
    'admin-console',
    'priority-support',
  ]
  const picked = []
  for (const id of priorityIds) {
    const feature = unlocked.find((f) => f.id === id)
    if (feature) picked.push(feature)
    if (picked.length >= 6) break
  }
  return picked
}

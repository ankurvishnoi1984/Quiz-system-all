export const HOST_ONBOARDING_STORAGE_PREFIX = 'host-onboarding-v1:'

export const HOST_ONBOARDING_STEPS = [
  {
    id: 'welcome',
    route: '/dashboard',
    target: 'dashboard-overview',
    placement: 'bottom',
    title: 'Welcome to your host portal',
    body: 'This walkthrough helps you create a session, add questions, share it with your audience, and go live. You can skip it — it only shows once.',
    nextLabel: 'Let’s create a session',
  },
  {
    id: 'create',
    route: '/dashboard',
    target: 'create-session',
    placement: 'bottom',
    title: 'Start with New Session',
    body: 'Use New Session whenever you want a quiz, poll, or survey. Next we will open the form so you can create your first one.',
    nextLabel: 'Open New Session',
  },
  {
    id: 'create-form',
    route: '/dashboard',
    target: 'session-form',
    placement: 'left',
    action: 'open-create-session',
    requireCompletion: 'auto',
    title: 'Create your session',
    body: 'Type a title (for example “Team quiz”). You can leave the other settings as they are for now. Then click Create session at the bottom.',
    nextLabel: 'I’ve created it',
  },
  {
    id: 'add-questions',
    route: '/builder',
    target: 'question-types',
    placement: 'right',
    requireCompletion: 'auto',
    title: 'Pick a question type',
    body: 'Choose a type on the left — quiz, poll, rating, and more. That opens the editor so you can write the question.',
    nextLabel: 'I picked a type',
  },
  {
    id: 'edit-question',
    route: '/builder',
    target: 'question-editor',
    placement: 'left',
    requireCompletion: true,
    title: 'Write the question',
    body: 'Type the question text. For MCQ or poll, edit the options and mark the correct answer if it is a quiz. Add as many questions as you need from the left.',
    nextLabel: 'Next: save',
  },
  {
    id: 'save-question',
    route: '/builder',
    target: 'save-question',
    placement: 'bottom',
    requireCompletion: 'auto',
    title: 'Save your questions',
    body: 'Click Save to store the questions on this session. You can come back and add more anytime while it is still a draft.',
    nextLabel: 'Next: sharing',
  },
  {
    id: 'share',
    route: '/live',
    target: 'share-panel',
    placement: 'left',
    action: 'open-share',
    title: 'Share with your audience',
    body: 'Copy the join link, QR code, or session code and send it to participants. They join in a browser — no app install.',
    nextLabel: 'Next: go live',
  },
  {
    id: 'launch',
    route: '/live',
    target: 'launch-session',
    placement: 'bottom',
    requireCompletion: 'auto',
    title: 'Go live',
    body: 'Click Launch to start the session. Participants can join, but they will not see a question until you activate one. You can also open Present Mode anytime for a projector or screen-share display — this page stays the host controls.',
    nextLabel: 'Next: activate',
  },
  {
    id: 'activate-question',
    route: '/live',
    target: 'activate-question',
    placement: 'bottom',
    requireCompletion: 'auto',
    title: 'Activate the question',
    body: 'Click Activate so participants can see and answer this question. If your session uses question sets or random order, use Activate all questions instead.',
    nextLabel: 'Next: host controls',
  },
  {
    id: 'host-controls',
    route: '/live',
    target: 'host-controls',
    placement: 'bottom',
    title: 'Run the live question',
    body: 'After it is live: Reveal answer shows the correct option, Question rankings / Show results share scores, and Reattempt opens another try. Watch responses and the live chart here. Present Mode is only for the audience screen — it is not where reports live.',
    nextLabel: 'Next: Session Analytics',
  },
  {
    id: 'analytics',
    route: '/analytics',
    target: 'session-analytics',
    placement: 'bottom',
    title: 'Review results in Session Analytics',
    body: 'This is Session Analytics. After the session, scores, participation, charts, and exports are here — not on the dashboard. Reports is also in the sidebar if you need a printable export.',
    nextLabel: 'Next: end session',
  },
  {
    id: 'end-session',
    route: '/live',
    target: 'end-session',
    placement: 'bottom',
    title: 'End the session when you are done',
    body: 'After questions are complete and you have collected responses, click End Session. That closes submissions and lets you review the final results in Session Analytics.',
    nextLabel: 'Next: video tutorials',
  },
  {
    id: 'tutorials',
    route: '/training',
    target: 'training-library',
    placement: 'bottom',
    title: 'Watch video tutorials anytime',
    body: 'You can also watch these walkthroughs whenever you need a recap. Open Training Library from the sidebar and play any title — session creation, preview mode, or how participants join.',
    nextLabel: 'Finish',
  },
]

export function isUserHintsCompleted(user) {
  return user?.hints_completed === true || user?.hints_completed === 1
}

export function hostOnboardingStorageKey(userId) {
  return `${HOST_ONBOARDING_STORAGE_PREFIX}${userId}`
}

export function readHostOnboardingState(userId) {
  if (!userId || typeof window === 'undefined') {
    return { completed: false, stepId: null, sessionId: null }
  }
  try {
    const raw = localStorage.getItem(hostOnboardingStorageKey(userId))
    if (!raw) return { completed: false, stepId: null, sessionId: null }
    const parsed = JSON.parse(raw)
    return {
      completed: Boolean(parsed?.completed),
      stepId: typeof parsed?.stepId === 'string' ? parsed.stepId : null,
      sessionId: parsed?.sessionId != null ? String(parsed.sessionId) : null,
    }
  } catch {
    return { completed: false, stepId: null, sessionId: null }
  }
}

export function writeHostOnboardingState(userId, state) {
  if (!userId || typeof window === 'undefined') return
  localStorage.setItem(hostOnboardingStorageKey(userId), JSON.stringify(state))
}

export function hostOnboardingStepIndex(stepId) {
  const mappedId = stepId === 'present' ? 'activate-question' : stepId
  const idx = HOST_ONBOARDING_STEPS.findIndex((step) => step.id === mappedId)
  return idx >= 0 ? idx : 0
}

const LIVE_TOUR_STEP_IDS = new Set(['share', 'launch', 'activate-question', 'host-controls', 'end-session'])

export function hostOnboardingPathForStep(step, sessionId) {
  if (!step?.route) return null
  const builderSteps = new Set(['add-questions', 'edit-question', 'save-question'])
  if (sessionId && (builderSteps.has(step.id) || step.route === '/builder')) {
    if (step.route === '/builder') {
      return `/builder?session=${encodeURIComponent(sessionId)}`
    }
  }
  if (sessionId && (LIVE_TOUR_STEP_IDS.has(step.id) || step.route === '/live')) {
    if (step.route === '/live') {
      return `/live?session=${encodeURIComponent(sessionId)}`
    }
  }
  if (step.route === '/analytics') {
    return sessionId ? `/analytics?session=${encodeURIComponent(sessionId)}` : '/analytics'
  }
  return step.route
}

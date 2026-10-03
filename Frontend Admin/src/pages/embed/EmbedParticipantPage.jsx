import ParticipantSessionPage from '../participant-session/ParticipantSessionPage'

/**
 * Slim participant surface for portal iframes.
 * Same join + quiz flow as /join/:code, with compact chrome and query-param identity.
 */
export default function EmbedParticipantPage() {
  return <ParticipantSessionPage embed />
}

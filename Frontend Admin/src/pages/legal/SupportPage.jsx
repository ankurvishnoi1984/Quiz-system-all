import { Link } from 'react-router-dom'
import {
  PRODUCT_NAME,
  SUPPORT_CONTACTS,
} from '../../constants/legalContacts'
import { DocSection, PublicDocLayout } from './PublicDocLayout'

export default function SupportPage() {
  return (
    <PublicDocLayout
      title="Support"
      subtitle={`Get help with ${PRODUCT_NAME} — host portal, participant join, live sessions, and the Zoom App.`}
    >
      <DocSection title="Contact our team">
        <p>Email any of the addresses below for product support, Zoom App help, or account questions:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {SUPPORT_CONTACTS.map((email) => (
            <li key={email}>
              <a className="font-semibold text-navy-800 hover:underline" href={`mailto:${email}`}>
                {email}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2">
          Please include your organization name, session code (if relevant), Zoom meeting ID (for Zoom App
          issues), screenshots, and steps to reproduce.
        </p>
      </DocSection>

      <DocSection title="Common topics we can help with">
        <ul className="list-disc space-y-1 pl-5">
          <li>Signing in to the host portal and plan / access questions</li>
          <li>Creating and launching live quiz, poll, or survey sessions</li>
          <li>Participant join (code, link, QR) and Zoom in-meeting join</li>
          <li>Linking a session to a Zoom meeting and host vs participant panels</li>
          <li>Timers, rankings, podium, and live controls</li>
          <li>Reports/exports and session analytics</li>
        </ul>
      </DocSection>

      <DocSection title="Zoom App help">
        <p>
          For step-by-step instructions on installing, using, and removing the {PRODUCT_NAME} Zoom App,
          see the{' '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/docs/zoom">
            Zoom documentation
          </Link>
          .
        </p>
      </DocSection>

      <DocSection title="Privacy &amp; legal">
        <p>
          <Link className="font-semibold text-navy-800 hover:underline" to="/privacy">
            Privacy policy
          </Link>
          {' · '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/terms">
            Terms of use
          </Link>
        </p>
        <p>
          For data-subject rights requests (access, correction, deletion, and related rights), use the
          contacts listed on the Privacy policy page.
        </p>
      </DocSection>

      <DocSection title="Host portal">
        <p>
          Existing hosts can sign in at{' '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/login">
            /login
          </Link>
          .
        </p>
      </DocSection>
    </PublicDocLayout>
  )
}

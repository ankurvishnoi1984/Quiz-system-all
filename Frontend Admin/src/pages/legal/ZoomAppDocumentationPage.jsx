import { Link } from 'react-router-dom'
import {
  PRODUCT_NAME,
  SUPPORT_CONTACTS,
} from '../../constants/legalContacts'
import { DocSection, PublicDocLayout } from './PublicDocLayout'

export default function ZoomAppDocumentationPage() {
  return (
    <PublicDocLayout
      title={`${PRODUCT_NAME} for Zoom — documentation`}
      subtitle="Zoom-specific guide for adding, using, and removing the High Voltage Zoom App in meetings."
    >
      <DocSection title="1. Overview">
        <p>
          The {PRODUCT_NAME} Zoom App lets hosts run live quizzes, polls, and rankings inside a Zoom
          meeting, while participants answer from the Apps panel without leaving the call.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Hosts:</strong> link a session, activate questions, control slides, and show rankings /
            podium.
          </li>
          <li>
            <strong>Participants:</strong> join the linked session and answer live questions in Zoom.
          </li>
        </ul>
      </DocSection>

      <DocSection title="2. Requirements">
        <ul className="list-disc space-y-1 pl-5">
          <li>A Zoom Workplace desktop client that supports Zoom Apps (Windows or macOS recommended)</li>
          <li>An active Zoom meeting (open the app from inside the meeting)</li>
          <li>A {PRODUCT_NAME} host account with permission to run sessions</li>
          <li>Network access to your {PRODUCT_NAME} admin portal / Zoom App home URL</li>
        </ul>
      </DocSection>

      <DocSection title="3. Adding / opening the app">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Start or join a Zoom meeting as the host (or co-host, if permitted by your Zoom settings).</li>
          <li>
            In the Zoom meeting toolbar, open <strong>Apps</strong> (or <strong>More → Apps</strong>).
          </li>
          <li>
            Find and open <strong>{PRODUCT_NAME}</strong>. If your organization uses a private/distributed
            app, install or approve it according to your Zoom admin process first.
          </li>
          <li>
            When prompted, authorize the app. The host panel loads inside Zoom.
          </li>
          <li>
            Sign in with your {PRODUCT_NAME} host credentials if asked, then link or select the session you
            want to run in this meeting.
          </li>
        </ol>
      </DocSection>

      <DocSection title="4. Using the app as a host">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Confirm the Zoom meeting is linked to your {PRODUCT_NAME} session (session code appears in the
            host panel).
          </li>
          <li>
            Start the session (make it live) from the host controls.
          </li>
          <li>
            Use <strong>Open for everyone</strong> / collaborate invite when available so participants can
            open the app during the meeting.
          </li>
          <li>
            Activate questions, close submissions, reveal answers, and move through Rankings / Podium
            slides as needed.
          </li>
          <li>
            Monitor joined / live participant counts and end the session when finished.
          </li>
        </ol>
      </DocSection>

      <DocSection title="5. Using the app as a participant">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Join the Zoom meeting.</li>
          <li>
            Open <strong>Apps</strong> and launch <strong>{PRODUCT_NAME}</strong> (or accept the host’s
            collaborate / open-for-everyone invitation).
          </li>
          <li>Complete the join form if prompted (nickname / required fields).</li>
          <li>Answer live questions, view timers, and follow rankings/podium when the host enables them.</li>
        </ol>
      </DocSection>

      <DocSection title="6. Removing / disconnecting the app">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Unlink this meeting</strong> from the host panel when you no longer want the meeting
            tied to the session.
          </li>
          <li>End or leave the Zoom meeting; the in-meeting app panel closes with the meeting.</li>
          <li>
            To remove the app from your Zoom account or organization catalog, use Zoom’s Apps management /
            Marketplace uninstall controls (account or admin settings, depending on how the app was
            installed).
          </li>
          <li>
            Optionally sign out of {PRODUCT_NAME} from the host panel if you shared a device.
          </li>
        </ol>
      </DocSection>

      <DocSection title="7. Troubleshooting">
        <ul className="list-disc space-y-1 pl-5">
          <li>Open the app from inside an active meeting, not only from the main Zoom Apps tab.</li>
          <li>Update Zoom Workplace to a current version that supports Zoom Apps.</li>
          <li>Confirm Marketplace / domain allow-list settings with your Zoom admin if the app fails to load.</li>
          <li>Linux Zoom clients may have limited Zoom Apps SDK support — use Windows or macOS when possible.</li>
          <li>
            If participants cannot see content, confirm the session is live and the host has opened /
            shared the app for attendees.
          </li>
        </ul>
      </DocSection>

      <DocSection title="8. Support &amp; related links">
        <p>
          Support:{' '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/support">
            /support
          </Link>
        </p>
        <p>
          Privacy:{' '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/privacy">
            /privacy
          </Link>
          {' · '}
          Terms:{' '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/terms">
            /terms
          </Link>
        </p>
        <p>
          Email:{' '}
          {SUPPORT_CONTACTS.map((email, index) => (
            <span key={email}>
              {index > 0 ? ' / ' : ''}
              <a className="font-semibold text-navy-800 hover:underline" href={`mailto:${email}`}>
                {email}
              </a>
            </span>
          ))}
        </p>
      </DocSection>
    </PublicDocLayout>
  )
}

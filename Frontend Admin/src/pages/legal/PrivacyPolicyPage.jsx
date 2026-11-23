import { Link } from 'react-router-dom'
import {
  ORGANIZATION_NAME,
  PRODUCT_NAME,
  SUPPORT_CONTACTS,
} from '../../constants/legalContacts'
import { DocSection, PublicDocLayout } from './PublicDocLayout'

export default function PrivacyPolicyPage() {
  return (
    <PublicDocLayout
      title="Privacy policy"
      subtitle={`How ${PRODUCT_NAME} collects, uses, shares, retains, and otherwise processes personal information for the web platform and Zoom App.`}
    >
      <DocSection title="1. Who we are">
        <p>
          {ORGANIZATION_NAME} operates {PRODUCT_NAME}, a live audience-engagement product for quizzes,
          polls, surveys, and rankings — including an in-meeting Zoom App for hosts and participants.
        </p>
      </DocSection>

      <DocSection title="2. Information we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Host / admin account data:</strong> name, email, organization details, authentication
            credentials or SSO identifiers, and plan/billing-related account metadata.
          </li>
          <li>
            <strong>Session &amp; content data:</strong> session configuration, questions, media, and
            settings created by hosts.
          </li>
          <li>
            <strong>Participant data:</strong> nicknames or identifiers provided at join, responses,
            scores, and participation timestamps for a session.
          </li>
          <li>
            <strong>Zoom context (when using the Zoom App):</strong> meeting/app context needed to link a
            session to a meeting and distinguish host vs participant roles inside Zoom.
          </li>
          <li>
            <strong>Technical &amp; security logs:</strong> IP address, device/browser metadata, and
            operational logs used for reliability, abuse prevention, and support.
          </li>
        </ul>
      </DocSection>

      <DocSection title="3. How we use information">
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide, operate, and improve {PRODUCT_NAME} and the Zoom App experience</li>
          <li>Authenticate hosts/admins and authorize access to sessions and reports</li>
          <li>Deliver live questions, results, rankings, and session analytics to authorized hosts</li>
          <li>Provide customer support and respond to security or privacy requests</li>
          <li>Detect, prevent, and investigate misuse, fraud, or abuse of live rooms</li>
          <li>Comply with legal obligations and enforce our Terms of use</li>
        </ul>
      </DocSection>

      <DocSection title="4. How we share information">
        <p>We do not sell personal information. We may share information only:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>With service providers who help us host, secure, or operate the product (under contractual controls)</li>
          <li>With Zoom as needed to operate the Zoom App inside a meeting (per Zoom’s platform requirements)</li>
          <li>With your organization admins/hosts for session operation and reporting</li>
          <li>When required by law, regulation, or to protect rights, safety, and platform integrity</li>
        </ul>
      </DocSection>

      <DocSection title="5. Retention">
        <p>
          We retain account, session, and response data for as long as needed to provide the service,
          meet contractual/legal obligations, resolve disputes, and maintain security records. Hosts and
          organization admins may control session content and exports according to product features and
          their internal policies.
        </p>
      </DocSection>

      <DocSection title="6. Security">
        <p>
          We apply administrative and technical controls appropriate to a live engagement platform,
          including authenticated host access, scoped participant tokens, transport encryption (HTTPS/TLS)
          in production, and operational controls such as join lock and abuse mitigation tools.
        </p>
      </DocSection>

      <DocSection title="7. Your data subject rights">
        <p>
          Depending on your location and applicable law (including GDPR and similar frameworks), you may
          have rights to:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate personal information</li>
          <li>Request deletion of personal information</li>
          <li>Request restriction of, or object to, certain processing</li>
          <li>Request portability of certain personal information</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>Lodge a complaint with a supervisory authority where applicable</li>
        </ul>
        <p>
          <strong>How to exercise these rights:</strong> email any of the contacts below with your
          request, the email associated with your account or participation, and enough detail for us to
          verify and fulfill the request. We will respond within the timelines required by applicable law.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {SUPPORT_CONTACTS.map((email) => (
            <li key={email}>
              <a className="font-semibold text-navy-800 hover:underline" href={`mailto:${email}`}>
                {email}
              </a>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection title="8. Children">
        <p>
          {PRODUCT_NAME} is intended for organizational, training, education, and meeting use managed by
          hosts. If you believe a child has provided personal information inappropriately, contact us so
          we can take appropriate action.
        </p>
      </DocSection>

      <DocSection title="9. International transfers">
        <p>
          If information is processed in regions other than where you are located, we take steps designed
          to protect it in accordance with this policy and applicable law.
        </p>
      </DocSection>

      <DocSection title="10. Changes">
        <p>
          We may update this privacy policy from time to time. The “Last updated” date at the top of this
          page reflects the latest revision. Continued use of {PRODUCT_NAME} after updates means you
          acknowledge the revised policy.
        </p>
      </DocSection>

      <DocSection title="11. Contact">
        <p>
          Privacy questions and data-subject requests:{' '}
          {SUPPORT_CONTACTS.map((email, index) => (
            <span key={email}>
              {index > 0 ? ' / ' : ''}
              <a className="font-semibold text-navy-800 hover:underline" href={`mailto:${email}`}>
                {email}
              </a>
            </span>
          ))}
          . Related pages:{' '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/terms">
            Terms of use
          </Link>
          {' · '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/support">
            Support
          </Link>
          .
        </p>
      </DocSection>
    </PublicDocLayout>
  )
}

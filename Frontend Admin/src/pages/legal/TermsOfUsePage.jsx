import { Link } from 'react-router-dom'
import {
  ORGANIZATION_NAME,
  PRODUCT_NAME,
  SUPPORT_CONTACTS,
} from '../../constants/legalContacts'
import { DocSection, PublicDocLayout } from './PublicDocLayout'

export default function TermsOfUsePage() {
  return (
    <PublicDocLayout
      title="Terms of use"
      subtitle={`Agreement for using ${PRODUCT_NAME}, including the host portal, participant experience, and Zoom App.`}
    >
      <DocSection title="1. Acceptance">
        <p>
          By accessing or using {PRODUCT_NAME} (websites, host portal, participant join flows, APIs, or
          Zoom App), you agree to these Terms of use. If you use the product on behalf of an
          organization, you represent that you are authorized to bind that organization.
        </p>
      </DocSection>

      <DocSection title="2. The service">
        <p>
          {PRODUCT_NAME} provides live audience engagement features such as quizzes, polls, surveys,
          rankings, analytics, and related host tools. Features available to you depend on your plan and
          organization settings. The Zoom App allows hosts and participants to use selected features
          inside a Zoom meeting.
        </p>
      </DocSection>

      <DocSection title="3. Accounts &amp; access">
        <ul className="list-disc space-y-1 pl-5">
          <li>Hosts and admins must keep credentials confidential and use accurate account information.</li>
          <li>You are responsible for activity under your account and for sessions you create or manage.</li>
          <li>Participants join sessions using codes/links or the Zoom App as configured by the host.</li>
          <li>We may suspend access for security, abuse, non-payment, or Terms violations.</li>
        </ul>
      </DocSection>

      <DocSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use the service unlawfully or to harm others</li>
          <li>Disrupt live sessions, bypass access controls, or attempt unauthorized access</li>
          <li>Upload malicious content or scrape the service in ways that impair availability</li>
          <li>Misuse participant data collected through your sessions</li>
          <li>Reverse engineer or interfere with Zoom/platform integrations beyond permitted use</li>
        </ul>
      </DocSection>

      <DocSection title="5. Content &amp; responsibility">
        <p>
          Hosts are responsible for session content (questions, media, branding) and for obtaining any
          rights or consents needed for their audience. {ORGANIZATION_NAME} does not endorse host-created
          content.
        </p>
      </DocSection>

      <DocSection title="6. Plans, capacity &amp; changes">
        <p>
          Plan limits (such as concurrent participants or feature access) may be enforced automatically.
          We may update features, interfaces, and integrations (including Zoom App capabilities) to
          improve security, reliability, or compliance.
        </p>
      </DocSection>

      <DocSection title="7. Third-party services">
        <p>
          {PRODUCT_NAME} may interoperate with third-party platforms such as Zoom. Your use of those
          platforms is also subject to their terms and policies. We are not responsible for third-party
          outages or policy changes outside our control.
        </p>
      </DocSection>

      <DocSection title="8. Intellectual property">
        <p>
          {PRODUCT_NAME} software, branding, and documentation remain the property of {ORGANIZATION_NAME}
          and its licensors. You retain rights to your session content, subject to the license needed for
          us to host and display it to deliver the service.
        </p>
      </DocSection>

      <DocSection title="9. Disclaimer &amp; limitation">
        <p>
          The service is provided on an “as available” basis. To the maximum extent permitted by law,
          {ORGANIZATION_NAME} disclaims warranties not expressly stated and limits liability for indirect,
          incidental, or consequential damages arising from use of the service.
        </p>
      </DocSection>

      <DocSection title="10. Termination">
        <p>
          You may stop using the service at any time. We may suspend or terminate access for breach of
          these Terms, security risk, or inactivity according to product/account policies.
        </p>
      </DocSection>

      <DocSection title="11. Changes to these Terms">
        <p>
          We may update these Terms. The “Last updated” date shows the current version. Continued use
          after changes constitutes acceptance of the updated Terms.
        </p>
      </DocSection>

      <DocSection title="12. Contact">
        <p>
          Questions about these Terms:{' '}
          {SUPPORT_CONTACTS.map((email, index) => (
            <span key={email}>
              {index > 0 ? ' / ' : ''}
              <a className="font-semibold text-navy-800 hover:underline" href={`mailto:${email}`}>
                {email}
              </a>
            </span>
          ))}
          . See also our{' '}
          <Link className="font-semibold text-navy-800 hover:underline" to="/privacy">
            Privacy policy
          </Link>
          .
        </p>
      </DocSection>
    </PublicDocLayout>
  )
}

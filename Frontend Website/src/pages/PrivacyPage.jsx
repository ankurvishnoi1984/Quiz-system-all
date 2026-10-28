import PageHero from '../components/marketing/PageHero'
import { SUPPORT_EMAIL } from '../constants/siteContent'

function PrivacyPage() {
  return (
    <div>
      <PageHero
        eyebrow="Privacy"
        title="Privacy policy overview"
        description="How High Voltage handles account, session, and support information at a high level."
      />
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-16 text-sm leading-relaxed text-slate-700 sm:px-6 lg:px-8">
        <p>
          High Voltage collects information needed to create host accounts, run live sessions, provide
          support, and improve the product.
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
          Information we process
        </h2>
        <p>
          Account details (such as name, email, and organization), session configuration, participant
          responses submitted during live events, and technical logs required for reliability and abuse
          prevention.
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
          How we use it
        </h2>
        <p>
          To deliver the service, authenticate users, generate session reports for hosts, communicate about
          the product, and protect the platform from misuse.
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
          Contact
        </h2>
        <p>
          Privacy questions can be sent to{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-accent hover:underline">
            {SUPPORT_EMAIL}
          </a>
          . This page is a summary for website visitors and may be expanded for formal contracts.
        </p>
      </section>
    </div>
  )
}

export default PrivacyPage

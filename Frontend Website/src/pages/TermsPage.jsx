import PageHero from '../components/marketing/PageHero'
import { SUPPORT_EMAIL } from '../constants/siteContent'

function TermsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Terms"
        title="Terms of use overview"
        description="Basic terms for using the High Voltage marketing site and related services."
      />
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-16 text-sm leading-relaxed text-slate-700 sm:px-6 lg:px-8">
        <p>
          By accessing High Voltage websites or services operated by Netcast Services, you agree to use the
          platform lawfully and respect other participants, hosts, and system integrity.
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
          Accounts &amp; acceptable use
        </h2>
        <p>
          Hosts are responsible for content they publish in sessions. Do not attempt to disrupt live events,
          bypass access controls, or misuse participant data collected through your sessions.
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
          Plans &amp; capacity
        </h2>
        <p>
          Features and concurrent participant capacity depend on the plan assigned to your account. Limits
          may be enforced automatically during live sessions.
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
          Contact
        </h2>
        <p>
          Questions about these terms:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-accent hover:underline">
            {SUPPORT_EMAIL}
          </a>
          . Formal enterprise agreements may include additional terms.
        </p>
      </section>
    </div>
  )
}

export default TermsPage

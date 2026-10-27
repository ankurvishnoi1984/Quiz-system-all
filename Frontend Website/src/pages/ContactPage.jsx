import { useState } from 'react'
import { CheckCircle2, Mail, MessageSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '../constants/siteContent'

function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    audience: '',
    message: '',
  })

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const subject = encodeURIComponent(`High Voltage demo request — ${form.organization || form.name}`)
    const body = encodeURIComponent(
      [
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Organization: ${form.organization}`,
        `Typical audience size: ${form.audience}`,
        '',
        form.message,
      ].join('\n')
    )
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
    setSubmitted(true)
  }

  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Contact</p>
            <h1 className="section-heading mt-3">Talk with the High Voltage team</h1>
            <p className="section-subheading">
              Book a demo, ask about enterprise plans, or get help sizing concurrent participant capacity.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl border border-slate-200 bg-navy-50 p-6">
              <Mail className="size-6 text-navy-700" />
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                Email support
              </h2>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2 block text-sm font-semibold text-navy-800 hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <MessageSquare className="size-6 text-accent" />
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-lg font-extrabold text-navy-950">
                What to include
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-navy-700" />
                  Peak concurrent audience size
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-navy-700" />
                  Training, classroom, or event format
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-navy-700" />
                  Preferred demo date/time
                </li>
              </ul>
              <Link to="/pricing" className="btn-link mt-5">
                Or compare plans first
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm lg:col-span-3 lg:p-9">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-navy-950">
              Request a demo
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Submit the form to open your email client with the details filled in.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-navy-800">
                Name
                <input
                  required
                  className="input-modern mt-1.5 rounded-xl"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-navy-800">
                Work email
                <input
                  required
                  type="email"
                  className="input-modern mt-1.5 rounded-xl"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-navy-800">
                Organization
                <input
                  className="input-modern mt-1.5 rounded-xl"
                  value={form.organization}
                  onChange={(e) => updateField('organization', e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-navy-800">
                Typical audience size
                <input
                  className="input-modern mt-1.5 rounded-xl"
                  placeholder="e.g. 80 concurrent"
                  value={form.audience}
                  onChange={(e) => updateField('audience', e.target.value)}
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-navy-800">
              How can we help?
              <textarea
                required
                rows={5}
                className="input-modern mt-1.5 rounded-xl"
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
              />
            </label>

            <button type="submit" className="btn-primary mt-6">
              Send request
            </button>

            {submitted ? (
              <p className="mt-4 text-sm text-navy-700">
                Your email client should open next. If it does not, write to{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline">
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  )
}

export default ContactPage

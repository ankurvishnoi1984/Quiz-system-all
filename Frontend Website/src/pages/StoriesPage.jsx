import { Quote } from 'lucide-react'
import { Link } from 'react-router-dom'
import CTASection from '../components/marketing/CTASection'
import { STORY_ITEMS } from '../constants/marketingPages'

function StoriesPage() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Stories</p>
            <h1 className="section-heading mt-3">How teams use High Voltage</h1>
            <p className="section-subheading">
              Short stories from training, education, and internal events — focused on outcomes, not
              hype.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {STORY_ITEMS.map((story) => (
            <article key={story.title} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7">
              <p className="text-xs font-bold uppercase tracking-wider text-navy-600">{story.sector}</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-extrabold text-navy-950">
                {story.title}
              </h2>
              <Quote className="mt-5 size-6 text-accent" />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{story.quote}</p>
              <p className="mt-6 border-t border-slate-100 pt-4 text-sm font-semibold text-navy-800">
                {story.outcome}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-navy-50 p-8 text-center sm:p-10">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-navy-950">
            Want your story featured?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            If your team runs recurring live sessions with High Voltage, we would love to hear what
            changed after you switched.
          </p>
          <Link to="/contact" className="btn-primary mt-6">
            Share your experience
          </Link>
        </div>
      </section>

      <CTASection
        title="See the product behind the stories"
        description="Explore features or pick a plan sized for your concurrent audience."
        primaryLabel="View features"
        primaryTo="/features"
        secondaryLabel="View pricing"
        secondaryTo="/pricing"
      />
    </div>
  )
}

export default StoriesPage

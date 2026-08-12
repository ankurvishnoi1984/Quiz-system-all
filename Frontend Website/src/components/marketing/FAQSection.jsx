import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FAQ_ITEMS } from '../../constants/siteContent'

function FAQSection({ items = FAQ_ITEMS, title = 'Frequently asked questions' }) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="border-t border-slate-200 bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="eyebrow">FAQ</p>
          <h2 className="section-heading mt-3">{title}</h2>
        </div>

        <div className="mt-10 space-y-3">
          {items.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <article key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-navy-900">{item.question}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-slate-200 px-5 pb-4 pt-1 text-sm leading-relaxed text-slate-600">
                    {item.answer}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FAQSection

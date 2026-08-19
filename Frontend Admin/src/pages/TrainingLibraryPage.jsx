import { Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TRAINING_VIDEOS } from '../constants/trainingVideos'

function TrainingLibraryPage() {
  const [activeId, setActiveId] = useState(TRAINING_VIDEOS[0]?.id)
  const activeVideo = useMemo(
    () => TRAINING_VIDEOS.find((item) => item.id === activeId) || TRAINING_VIDEOS[0],
    [activeId],
  )

  return (
    <section data-tour="training-library" className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy-700">Host resources</p>
        <h2 className="mt-1 text-2xl font-bold text-navy-900">Training Library</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Watch short walkthroughs of the host workflow. Select any title to play it here.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        <div className="overflow-hidden rounded-2xl border border-blue-200/70 bg-navy-950 shadow-lg shadow-navy-900/10">
          <video
            key={activeVideo.src}
            className="aspect-video w-full bg-navy-950"
            src={activeVideo.src}
            controls
            playsInline
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
          <div className="border-t border-white/10 bg-navy-900 px-5 py-4">
            <h3 className="text-lg font-bold text-white">{activeVideo.title}</h3>
            <p className="mt-1 text-sm text-blue-100/80">{activeVideo.description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy-700">Tutorials</p>
          {TRAINING_VIDEOS.map((video, index) => {
            const isActive = video.id === activeVideo.id
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => setActiveId(video.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? 'border-navy-700 bg-navy-900 text-white shadow-md shadow-navy-900/20'
                    : 'border-blue-200/70 bg-white/90 text-slate-700 hover:bg-blue-50'
                }`}
              >
                <span
                  className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${
                    isActive ? 'bg-white/15 text-white' : 'bg-navy-900 text-white'
                  }`}
                >
                  {isActive ? <Play className="size-4 fill-current" /> : <span className="text-xs font-bold">{index + 1}</span>}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${isActive ? 'text-white' : 'text-navy-900'}`}>
                    {video.title}
                  </span>
                  <span className={`mt-1 block text-xs leading-relaxed ${isActive ? 'text-blue-100/80' : 'text-slate-600'}`}>
                    {video.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default TrainingLibraryPage

import { APP_LOGO_ALT, APP_LOGO_SRC } from '../../constants/reportBranding'
import { resolveQuestionMediaUrl } from '../../utils/questionMedia'

/**
 * Portal + optional session logo for participant and present surfaces.
 * Custom session logo is shown whenever `sessionLogoUrl` is set.
 * @param {'hero' | 'header' | 'present'} variant
 */
export function BrandLogoPair({
  sessionLogoUrl,
  sessionTitle = 'Session',
  variant = 'hero',
  className = '',
}) {
  const customSrc = resolveQuestionMediaUrl(sessionLogoUrl)
  const showCustom = Boolean(customSrc)

  if (variant === 'present') {
    // Present Mode: custom logo when available; otherwise portal mark
    if (showCustom) {
      return (
        <div className={`flex min-w-0 items-center gap-3 ${className}`}>
          <img
            src={customSrc}
            alt={`${sessionTitle} logo`}
            className="h-11 w-auto max-w-[12rem] object-contain object-left sm:h-14 sm:max-w-[14rem]"
          />
        </div>
      )
    }
    return (
      <div className={`flex min-w-0 items-center ${className}`}>
        <img
          src={APP_LOGO_SRC}
          alt={APP_LOGO_ALT}
          className="h-8 w-auto max-w-[7rem] object-contain object-left opacity-90 sm:h-9"
        />
      </div>
    )
  }

  if (variant === 'header') {
    return (
      <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
        <img
          src={APP_LOGO_SRC}
          alt={APP_LOGO_ALT}
          className="h-7 w-auto max-w-[5.5rem] object-contain object-left"
        />
        {showCustom ? (
          <>
            <span className="h-6 w-px shrink-0 bg-blue-200/80" aria-hidden />
            <img
              src={customSrc}
              alt={`${sessionTitle} logo`}
              className="h-8 w-auto max-w-[6.5rem] object-contain object-left"
            />
          </>
        ) : null}
      </div>
    )
  }

  // hero — join / waiting: portal always; custom beside it when set
  if (!showCustom) {
    return (
      <div className={`mx-auto mb-4 flex justify-center ${className}`}>
        <img
          src={APP_LOGO_SRC}
          alt={APP_LOGO_ALT}
          className="h-14 w-auto max-w-[11rem] object-contain"
        />
      </div>
    )
  }

  return (
    <div className={`mx-auto mb-4 flex w-full max-w-md flex-col items-center gap-3 ${className}`}>
      <div className="flex w-full items-center justify-center gap-4 sm:gap-5">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex h-16 w-full items-center justify-center rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-sm shadow-navy-900/5">
            <img
              src={APP_LOGO_SRC}
              alt={APP_LOGO_ALT}
              className="h-10 w-auto max-w-full object-contain"
            />
          </div>
         
        </div>

        <span className="hidden h-10 w-px shrink-0 bg-blue-200/80 sm:block" aria-hidden />

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="flex h-16 w-full items-center justify-center rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-sm shadow-navy-900/5">
            <img
              src={customSrc}
              alt={`${sessionTitle} logo`}
              className="h-10 w-auto max-w-full object-contain"
            />
          </div>
        
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/features/i18n/I18nProvider'

interface Props {
  images: string[]
  label: string
}

/**
 * Scroll-snap carousel: native touch swipe, mouse drag, arrow buttons and arrow keys.
 * Follows the WAI-ARIA carousel pattern (region + slide groups with "n of total" labels).
 */
export function Carousel({ images, label }: Props) {
  const { t } = useI18n()
  const trackRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLLIElement | null)[]>([])
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<Set<number>>(new Set())
  const drag = useRef<{ startX: number; startLeft: number; active: boolean } | null>(null)
  const [dragging, setDragging] = useState(false)

  // Track which slide is centred with an IntersectionObserver (no layout reads while scrolling).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setIndex(slideRefs.current.indexOf(entry.target as HTMLLIElement))
        }
      },
      { root: track, threshold: 0.6 },
    )
    slideRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [images.length])

  const goTo = (target: number) => {
    const clamped = Math.max(0, Math.min(images.length - 1, target))
    slideRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  const indexRef = useRef(0)
  indexRef.current = index

  // Keyboard (←/→) and mouse-drag are wired natively; touch uses the browser's own scrolling.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const slideTo = (target: number) => {
      const clamped = Math.max(0, Math.min(slideRefs.current.length - 1, target))
      slideRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        slideTo(indexRef.current + 1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        slideTo(indexRef.current - 1)
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      drag.current = { startX: event.clientX, startLeft: track.scrollLeft, active: false }
    }
    const onPointerMove = (event: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const delta = event.clientX - d.startX
      if (!d.active && Math.abs(delta) > 4) {
        d.active = true
        setDragging(true)
        track.setPointerCapture(event.pointerId)
      }
      if (d.active) track.scrollLeft = d.startLeft - delta
    }
    const endDrag = () => {
      drag.current = null
      setDragging(false) // re-enables snapping, which settles on the nearest slide
    }
    track.addEventListener('keydown', onKeyDown)
    track.addEventListener('pointerdown', onPointerDown)
    track.addEventListener('pointermove', onPointerMove)
    track.addEventListener('pointerup', endDrag)
    track.addEventListener('pointercancel', endDrag)
    return () => {
      track.removeEventListener('keydown', onKeyDown)
      track.removeEventListener('pointerdown', onPointerDown)
      track.removeEventListener('pointermove', onPointerMove)
      track.removeEventListener('pointerup', endDrag)
      track.removeEventListener('pointercancel', endDrag)
    }
  }, [])

  if (images.length === 0) return null
  const arrow =
    'grid size-12 place-items-center rounded-full border border-ink/40 text-ink transition-colors hover:border-accent hover:bg-accent hover:text-primary disabled:pointer-events-none disabled:opacity-30'

  return (
    <section aria-roledescription="carousel" aria-label={label} className="py-12 md:py-20">
      <div
        ref={trackRef}
        // A scrollable region must be keyboard-focusable (axe: scrollable-region-focusable).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="group"
        aria-label={label}
        data-lenis-prevent-touch
        className={`flex touch-pan-x gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:gap-6 md:px-10 [&::-webkit-scrollbar]:hidden ${
          dragging ? 'cursor-grabbing select-none' : 'cursor-grab snap-x snap-mandatory'
        }`}
      >
        <ul className="contents">
          {images.map((src, i) => (
            <li
              key={`${src}-${i}`}
              ref={(el) => {
                slideRefs.current[i] = el
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={t('project.slide', { current: i + 1, total: images.length })}
              className="aspect-[16/10] w-[86%] shrink-0 snap-center overflow-hidden rounded-lg bg-ink/10 md:w-[68%]"
            >
              {!failed.has(i) && (
                <img
                  src={src}
                  alt=""
                  loading={i === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                  onError={() => setFailed((prev) => new Set(prev).add(i))}
                  className="size-full object-cover"
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between px-5 md:px-10">
        <p className="font-display text-sm tabular-nums tracking-[0.2em] text-ink/70" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}{' '}
          <span className="text-ink/35">/ {String(images.length).padStart(2, '0')}</span>
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className={arrow}
            aria-label={t('project.prevSlide')}
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            className={arrow}
            aria-label={t('project.nextSlide')}
            disabled={index === images.length - 1}
            onClick={() => goTo(index + 1)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}

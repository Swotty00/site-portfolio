import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { useI18n } from '@/features/i18n/I18nProvider'
import { useSmoothScroll } from '@/features/scroll/SmoothScrollProvider'
import { TransitionLink } from '@/features/transitions/TransitionProvider'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'
import type { ProfilePublic } from '@/types/api'
import { SplitText } from './SplitText'

interface Props {
  open: boolean
  origin: { x: number; y: number }
  profile: ProfilePublic | undefined
  onClose: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The overlay lives in the DOM from the first render (hidden + inert), so opening it is a
 * pure animation: a circular clip-path reveal from the trigger, then outlined letters rising
 * into place and filling in.
 */
export function AboutOverlay({ open, origin, profile, onClose }: Props) {
  const { t } = useI18n()
  const scroll = useSmoothScroll()
  const rootRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const hasOpened = useRef(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    timeline.current?.kill()

    if (open) {
      hasOpened.current = true
      scroll.stop()
      root.style.visibility = 'visible'
      closeRef.current?.focus({ preventScroll: true })

      if (prefersReducedMotion()) {
        gsap.set(root, { clipPath: 'none' })
        return
      }
      const chars = root.querySelectorAll('[data-about-title] [data-char]')
      const words = root.querySelectorAll('[data-about-body] [data-char]')
      const fades = root.querySelectorAll('[data-about-fade]')
      const reach = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y))
      timeline.current = gsap
        .timeline()
        .fromTo(
          root,
          { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
          { clipPath: `circle(${reach + 40}px at ${origin.x}px ${origin.y}px)`, duration: 1.05, ease: 'expo.inOut' },
        )
        .fromTo(
          chars,
          { yPercent: 115, rotate: 6 },
          { yPercent: 0, rotate: 0, duration: 1, ease: 'expo.out', stagger: 0.035 },
          '-=0.45',
        )
        .fromTo(
          words,
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.8, ease: 'power4.out', stagger: { each: 0.008, from: 'start' } },
          '-=0.7',
        )
        // Outline → solid fill: the body copy starts as stroked glyphs and fills in.
        .fromTo(
          words,
          { color: 'transparent', webkitTextStroke: '1px rgb(var(--c-bg))' },
          { color: 'rgb(var(--c-bg))', duration: 0.6, ease: 'power2.out', stagger: { each: 0.006 } },
          '<0.15',
        )
        .fromTo(
          fades,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08 },
          '-=0.6',
        )
    } else if (hasOpened.current) {
      scroll.start()
      if (prefersReducedMotion()) {
        root.style.visibility = 'hidden'
        return
      }
      timeline.current = gsap.timeline({ onComplete: () => void (root.style.visibility = 'hidden') }).to(root, {
        clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`,
        duration: 0.7,
        ease: 'expo.inOut',
      })
    }
    return () => {
      timeline.current?.kill()
    }
    // `origin` is captured when opening; it should not retrigger the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Escape closes; Tab is trapped inside the dialog while it is open.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const nodes = rootRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes?.length) return
      const first = nodes[0]!
      const last = nodes[nodes.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const paragraphs = profile?.about.length ? profile.about : profile?.bio ? [profile.bio] : []

  return (
    <div
      id="about-overlay"
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      aria-hidden={!open}
      inert={!open}
      style={{ visibility: 'hidden', clipPath: 'circle(0px at 50% 50%)' }}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-accent text-primary"
      data-lenis-prevent
    >
      <div className="mx-auto flex min-h-full max-w-[110rem] flex-col px-5 pb-10 pt-5 md:px-10 md:pt-7">
        <div className="flex items-center justify-between">
          <p className="flex items-baseline gap-2 font-display text-sm font-medium uppercase tracking-[0.16em]">
            <span className="text-[0.65rem] tabular-nums">01</span>
            {t('nav.about')}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="mr-24 flex items-center gap-2 rounded-full border border-primary/60 px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.16em] transition-colors hover:bg-primary hover:text-accent md:mr-28"
          >
            {t('a11y.close')}
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M1 1l10 10M11 1 1 11" />
            </svg>
          </button>
        </div>

        <h2
          id="about-title"
          data-about-title
          className="mt-8 font-display text-[clamp(4.5rem,19vw,19rem)] font-bold uppercase leading-[0.82] tracking-tightest md:mt-12"
        >
          <SplitText text={t('about.title')} className="text-transparent [-webkit-text-stroke:2px_rgb(var(--c-bg))]" />
        </h2>

        <div className="mt-10 grid gap-10 md:mt-16 md:grid-cols-12">
          <p data-about-fade className="font-display text-2xl font-medium leading-tight md:col-span-4 md:text-3xl">
            {profile?.headline}
          </p>

          <div data-about-body className="space-y-6 md:col-span-7 md:col-start-6">
            {paragraphs.map((text, i) => (
              <SplitText
                key={i}
                as="p"
                text={text}
                className="block font-display text-xl font-medium leading-snug md:text-3xl md:leading-[1.2]"
              />
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-8 border-t border-primary/30 pt-8 md:mt-auto md:grid-cols-12">
          <p data-about-fade className="flex items-center gap-3 text-sm font-medium md:col-span-4">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            {t('about.available')}
          </p>
          <div data-about-fade className="flex flex-wrap items-center gap-x-8 gap-y-3 md:col-span-8 md:col-start-6">
            {profile?.email && (
              <a
                href={`mailto:${profile.email}`}
                className="link-underline font-display text-sm font-medium uppercase tracking-[0.14em]"
              >
                {t('about.contact')} →
              </a>
            )}
            <TransitionLink
              to="/profile"
              label={t('nav.profile')}
              onClick={onClose}
              className="link-underline font-display text-sm font-medium uppercase tracking-[0.14em]"
            >
              {t('about.profileCta')} →
            </TransitionLink>
            {profile?.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline font-display text-sm font-medium uppercase tracking-[0.14em]"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Endless outlined marquee along the bottom edge. */}
      <div aria-hidden="true" className="pointer-events-none overflow-hidden border-t border-primary/30 py-3">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-display text-4xl font-bold uppercase tracking-tightest text-transparent [-webkit-text-stroke:1px_rgb(var(--c-bg))] md:text-6xl">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i}>{t('about.available')} ✦</span>
          ))}
        </div>
      </div>
    </div>
  )
}

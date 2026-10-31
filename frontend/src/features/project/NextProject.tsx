import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { useI18n } from '@/features/i18n/I18nProvider'
import { TransitionLink } from '@/features/transitions/TransitionProvider'
import { usePrefetchProject } from '@/hooks/useContent'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'
import type { ProjectLink } from '@/types/api'

const titleClass = 'font-display text-[clamp(3.2rem,13vw,14rem)] font-bold uppercase leading-[0.88] tracking-tightest'

/**
 * "Next project" call-to-action. The giant title fills in as the visitor scrolls towards it
 * (scrubbed ScrollTrigger), and the link wraps around from the last project to the first.
 */
export function NextProject({ next }: { next: ProjectLink | null }) {
  const { t } = useI18n()
  const prefetch = usePrefetchProject()
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-fill]',
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 55%', scrub: true },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [next?.slug])

  if (!next) {
    return (
      <section className="px-5 py-24 md:px-10">
        <TransitionLink to="/" label={t('nav.work')} className="btn">
          ← {t('project.back')}
        </TransitionLink>
      </section>
    )
  }

  return (
    <TransitionLink
      ref={ref}
      to={`/projects/${next.slug}`}
      label={next.title}
      onPointerEnter={() => prefetch(next.slug)}
      onFocus={() => prefetch(next.slug)}
      className="group block border-t border-ink/15 px-5 pb-24 pt-16 md:px-10 md:pb-32 md:pt-24"
    >
      <p className="eyebrow mb-6 flex items-center gap-4">
        {t('project.next')}
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-500 ease-out-expo group-hover:translate-x-3"
        >
          →
        </span>
      </p>
      <span className="relative block">
        <span aria-hidden="true" className={`${titleClass} text-outline-thin block`}>
          {next.title}
        </span>
        <span data-fill aria-hidden="true" className={`${titleClass} absolute inset-0 block text-accent`}>
          {next.title}
        </span>
        <span className="sr-only">
          {t('project.next')}: {next.title}
        </span>
      </span>
    </TransitionLink>
  )
}

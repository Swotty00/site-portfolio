import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Carousel } from '@/components/Carousel'
import { ErrorState } from '@/components/ErrorState'
import { PageLoader } from '@/components/PageLoader'
import { SplitText } from '@/components/SplitText'
import { useI18n } from '@/features/i18n/I18nProvider'
import { TransitionLink } from '@/features/transitions/TransitionProvider'
import { usePageEnter } from '@/features/transitions/usePageEnter'
import { useProfile, useProject } from '@/hooks/useContent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'
import { ApiError } from '@/services/http'
import { NextProject } from './NextProject'
import { NotFoundView } from '../../components/NotFoundView'

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div data-reveal>
      <dt className="eyebrow mb-3">{label}</dt>
      <dd className="text-base leading-relaxed md:text-lg">{children}</dd>
    </div>
  )
}

export default function ProjectPage() {
  const { slug } = useParams()
  const { t } = useI18n()
  const { data: project, error, isPending, refetch } = useProject(slug)
  const { data: profile } = useProfile()
  const rootRef = useRef<HTMLElement>(null)

  useDocumentTitle(
    project ? `${project.title} — ${profile?.name ?? ''}`.replace(/ — $/, '') : undefined,
    project?.summary,
  )

  usePageEnter(Boolean(project), () => {
    const root = rootRef.current
    if (!root) return
    root.dataset.enter = 'done'
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .fromTo(
          '[data-title] [data-char]',
          { yPercent: 115, rotate: 5 },
          { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.04 },
        )
        .fromTo('[data-enter-item]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 }, '-=0.9')

      // Everything below the fold fades up as it scrolls into view.
      gsap.set('[data-reveal]', { opacity: 0 })
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 90%',
        once: true,
        onEnter: (els) =>
          gsap.fromTo(els, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1 }),
      })
    }, root)
    return () => ctx.revert()
  })

  // Images change the page height as they load: keep ScrollTrigger positions accurate.
  useEffect(() => {
    if (!project) return
    const timer = window.setTimeout(() => ScrollTrigger.refresh(), 600)
    return () => window.clearTimeout(timer)
  }, [project])

  if (error && !project) {
    if (error instanceof ApiError && error.isNotFound) return <NotFoundView />
    return <ErrorState error={error} onRetry={() => void refetch()} className="pt-40" />
  }
  if (isPending || !project) return <PageLoader />

  const gallery = [project.cover_image, ...project.images].filter(Boolean)
  const paragraphs = project.description.split(/\n{2,}/).filter(Boolean)

  return (
    <article ref={rootRef} data-enter="pending">
      <header className="px-5 pt-32 md:px-10 md:pt-40">
        <TransitionLink to="/" label={t('nav.work')} data-enter-item className="eyebrow link-underline inline-block">
          ← {t('project.back')}
        </TransitionLink>
        <h1
          data-title
          className="mt-8 font-display text-[clamp(3.4rem,14vw,15rem)] font-bold uppercase leading-[0.86] tracking-tightest"
        >
          <SplitText text={project.title} className="text-outline" />
        </h1>
        {project.summary && (
          <p data-enter-item className="mt-8 max-w-2xl text-xl leading-snug text-ink/85 md:text-3xl md:leading-tight">
            {project.summary}
          </p>
        )}
      </header>

      <dl className="mt-16 grid gap-10 border-y border-ink/15 px-5 py-10 sm:grid-cols-2 md:mt-24 md:grid-cols-4 md:px-10">
        <Meta label={t('project.client')}>
          {project.client_url ? (
            <a href={project.client_url} target="_blank" rel="noopener noreferrer" className="link-underline">
              {project.client || project.client_url} ↗
            </a>
          ) : (
            project.client || '—'
          )}
        </Meta>
        <Meta label={t('project.year')}>{project.year}</Meta>
        <Meta label={t('project.role')}>{project.role || '—'}</Meta>
        <Meta label={t('project.credits')}>
          <ul className="space-y-1">
            {project.credits.map((credit) => (
              <li key={`${credit.role}-${credit.name}`}>
                <span className="text-ink/55">{credit.role}</span>{' '}
                {credit.url ? (
                  <a href={credit.url} target="_blank" rel="noopener noreferrer" className="link-underline">
                    {credit.name}
                  </a>
                ) : (
                  credit.name
                )}
              </li>
            ))}
          </ul>
        </Meta>
      </dl>

      <section className="grid gap-10 px-5 py-16 md:grid-cols-12 md:px-10 md:py-24">
        <div
          data-reveal
          className="space-y-6 text-lg leading-relaxed text-ink/85 md:col-span-7 md:col-start-5 md:text-xl"
        >
          {paragraphs.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
        <div data-reveal className="flex flex-col items-start gap-6 md:col-span-3 md:row-start-1">
          {project.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-ink/30 px-3 py-1 font-display text-[0.7rem] uppercase tracking-[0.16em]"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="btn">
              {t('project.visit')} ↗
            </a>
          )}
        </div>
      </section>

      <div data-reveal>
        <Carousel images={gallery} label={t('project.gallery')} />
      </div>

      <NextProject next={project.next} />
    </article>
  )
}

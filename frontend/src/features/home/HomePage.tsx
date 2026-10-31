import gsap from 'gsap'
import { useRef } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { PageLoader } from '@/components/PageLoader'
import { SplitText } from '@/components/SplitText'
import { useI18n } from '@/features/i18n/I18nProvider'
import { usePageEnter } from '@/features/transitions/usePageEnter'
import { useProfile, useProjects } from '@/hooks/useContent'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'
import { ProjectList3D } from './ProjectList3D'

export default function HomePage() {
  const { t } = useI18n()
  const projects = useProjects()
  const { data: profile } = useProfile()
  const heroRef = useRef<HTMLElement>(null)

  usePageEnter(Boolean(profile), () => {
    const hero = heroRef.current
    if (!hero) return
    hero.dataset.enter = 'done'
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .fromTo(
          '[data-hero-name] [data-char]',
          { yPercent: 115, rotate: 5 },
          { yPercent: 0, rotate: 0, duration: 1.4, stagger: 0.04 },
        )
        .fromTo('[data-enter-item]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.12 }, '-=1.0')
    }, hero)
    return () => ctx.revert()
  })

  return (
    <>
      <section
        ref={heroRef}
        data-enter="pending"
        className="relative flex min-h-[80svh] flex-col justify-end px-5 pb-10 pt-32 md:px-10 md:pb-14"
      >
        <p data-enter-item className="eyebrow mb-6">
          {t('home.eyebrow', { year: new Date().getFullYear() })}
        </p>
        <h1
          data-hero-name
          className="font-display text-[clamp(3.6rem,15.5vw,16rem)] font-bold uppercase leading-[0.86] tracking-tightest"
        >
          {profile ? <SplitText text={profile.name} className="text-outline" /> : <span className="invisible">…</span>}
        </h1>
        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p data-enter-item className="max-w-md text-lg leading-snug text-ink/80 md:text-xl">
            {profile?.headline}
          </p>
          <p
            data-enter-item
            className="flex items-center gap-4 font-display text-xs uppercase tracking-[0.22em] text-accent"
          >
            {t('home.scroll')}
            <span aria-hidden="true" className="relative block h-px w-16 overflow-hidden bg-accent/30">
              <span className="absolute inset-y-0 left-0 w-1/2 animate-[loader_1.8s_cubic-bezier(.65,0,.35,1)_infinite] bg-accent" />
            </span>
          </p>
        </div>
      </section>

      <section id="work" aria-label={t('home.selected')} className="pb-24 pt-10 md:pb-40">
        <div className="flex items-baseline justify-between px-5 pb-6 md:px-10">
          <h2 className="eyebrow">{t('home.selected')}</h2>
          {projects.data && (
            <span className="eyebrow tabular-nums">({String(projects.data.length).padStart(2, '0')})</span>
          )}
        </div>

        {projects.isPending && <PageLoader />}
        {projects.error && !projects.data && (
          <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
        )}
        {projects.data?.length === 0 && <p className="px-5 py-20 text-ink/70 md:px-10">{t('home.empty')}</p>}
        {projects.data && projects.data.length > 0 && <ProjectList3D projects={projects.data} />}
      </section>
    </>
  )
}

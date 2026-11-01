import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useRef, type ReactNode } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { PageLoader } from '@/components/PageLoader'
import { SplitText } from '@/components/SplitText'
import { useI18n } from '@/features/i18n/I18nProvider'
import { usePageEnter } from '@/features/transitions/usePageEnter'
import { useProfile } from '@/hooks/useContent'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'
import { trackResumeClick } from '@/services/analytics'
import { TechLink } from './TechLink'

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section data-reveal className="border-t border-ink/20 py-10 md:py-14">
      <h2 className="mb-8 flex items-baseline gap-4 font-display text-sm font-medium uppercase tracking-[0.2em] text-accent">
        <span className="text-[0.65rem] tabular-nums">{number}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Square-bulleted list in the spirit of a printed résumé. */
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="relative pl-6 leading-relaxed text-ink/90 before:absolute before:left-0 before:top-[0.7em] before:size-1.5 before:bg-accent"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function ProfilePage() {
  const { t, locale } = useI18n()
  const { data: profile, error, isPending, refetch } = useProfile()
  const rootRef = useRef<HTMLDivElement>(null)

  useDocumentTitle(profile ? `${t('nav.profile')} — ${profile.name}` : undefined, profile?.bio)

  usePageEnter(Boolean(profile), () => {
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
        .fromTo('[data-enter-item]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09 }, '-=0.9')
      gsap.set('[data-reveal]', { opacity: 0 })
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 90%',
        once: true,
        onEnter: (els) =>
          gsap.fromTo(els, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.12 }),
      })
    }, root)
    return () => ctx.revert()
  })

  if (error && !profile) return <ErrorState error={error} onRetry={() => void refetch()} className="pt-40" />
  if (isPending || !profile) return <PageLoader />

  return (
    <div ref={rootRef} data-enter="pending" className="px-5 pb-24 pt-32 md:px-10 md:pt-40">
      <div className="mx-auto grid max-w-[110rem] gap-12 lg:grid-cols-12 lg:gap-16">
        <aside className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
          <h1
            data-title
            className="font-display text-[clamp(3rem,9vw,8.5rem)] font-bold uppercase leading-[0.88] tracking-tightest"
          >
            <SplitText text={profile.name} className="text-outline" />
          </h1>
          <p data-enter-item className="mt-6 font-display text-xl font-medium text-accent md:text-2xl">
            {profile.headline}
          </p>
          <p data-enter-item className="mt-5 max-w-md text-lg leading-relaxed text-ink/85">
            {profile.bio}
          </p>

          <dl data-enter-item className="mt-8 space-y-1.5 text-sm text-ink/80">
            {profile.location && <dd>{profile.location}</dd>}
            {profile.email && (
              <dd>
                <a href={`mailto:${profile.email}`} className="link-underline">
                  {profile.email}
                </a>
              </dd>
            )}
            {profile.phone && <dd>{profile.phone}</dd>}
          </dl>
          <ul data-enter-item className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {profile.links.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-underline">
                  {link.label} ↗
                </a>
              </li>
            ))}
          </ul>

          {profile.resume_url && (
            <div data-enter-item className="mt-10">
              {/* The PDF is yours to host (Drive, Dropbox, or /public): we only link to it. */}
              <a
                href={profile.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                onClick={() => trackResumeClick(locale)}
              >
                {t('profile.resume')}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </a>
            </div>
          )}
        </aside>

        <div className="lg:col-span-7">
          {profile.stack.length > 0 && (
            <Section number="01" title={t('profile.stack')}>
              <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
                {profile.stack.map((group) => (
                  <div key={group.category}>
                    <h3 className="mb-4 font-display text-lg font-semibold">{group.category}</h3>
                    <ul className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <li key={item}>
                          <TechLink name={item} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {profile.experience.length > 0 && (
            <Section number="02" title={t('profile.experience')}>
              <div className="space-y-12">
                {profile.experience.map((job) => (
                  <article key={`${job.company}-${job.period}`}>
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <h3 className="font-display text-xl font-semibold md:text-2xl">{job.role}</h3>
                      <span className="font-display text-xs uppercase tracking-[0.18em] text-ink/60">{job.period}</span>
                    </div>
                    <p className="mb-5 text-ink/65">
                      {job.company}
                      {job.location && ` — ${job.location}`}
                    </p>
                    <Bullets items={job.bullets} />
                  </article>
                ))}
              </div>
            </Section>
          )}

          {profile.education.length > 0 && (
            <Section number="03" title={t('profile.education')}>
              <ul className="space-y-5">
                {profile.education.map((item) => (
                  <li
                    key={`${item.institution}-${item.period}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-6"
                  >
                    <div>
                      <p className="font-display text-lg font-semibold">{item.institution}</p>
                      <p className="text-ink/70">{item.degree}</p>
                    </div>
                    <span className="font-display text-xs uppercase tracking-[0.18em] text-ink/60">{item.period}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

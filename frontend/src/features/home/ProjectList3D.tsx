import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/features/i18n/I18nProvider'
import { TransitionLink } from '@/features/transitions/TransitionProvider'
import { usePrefetchProject } from '@/hooks/useContent'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { ProjectPublic } from '@/types/api'
import { ProjectPreview } from './ProjectPreview'
import { PERSPECTIVE_PX } from './rowTransform'
import { useList3D } from './useList3D'

/**
 * Two stacked layers with identical row boxes:
 *  1. a decorative, `pointer-events: none` layer whose rows are 3D-transformed, and
 *  2. a flat layer of real links that owns every hover, focus and click.
 * Hit-testing therefore never depends on the (constantly changing) 3D geometry, so rows don't
 * flicker when they flatten under the cursor and clicks always land on the row you see.
 */
export function ProjectList3D({ projects }: { projects: ProjectPublic[] }) {
  const { t } = useI18n()
  const reduced = useReducedMotion()
  const compact = useMediaQuery('(max-width: 767px)')
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)')
  const prefetch = usePrefetchProject()
  const stageRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActiveIndex] = useState<number | null>(null)

  const { playEntry, setActive } = useList3D({
    stageRef,
    rowRefs,
    count: projects.length,
    compact,
    reducedMotion: reduced,
  })

  const activate = useCallback(
    (index: number | null) => {
      setActiveIndex(index)
      setActive(index)
    },
    [setActive],
  )

  // Play the spiral-staircase entrance as the list scrolls into view (once).
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || projects.length === 0) return
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top 90%',
      once: true,
      onEnter: () => void playEntry(),
    })
    return () => trigger.kill()
  }, [playEntry, projects.length])

  return (
    <div
      ref={stageRef}
      className="relative [--row-h:clamp(5.5rem,15svh,8rem)] md:[--row-h:clamp(6.5rem,22svh,13.5rem)]"
      style={{ perspective: `${PERSPECTIVE_PX}px`, perspectiveOrigin: '50% 50%' }}
    >
      {/* Layer 1 — visual, 3D, never receives pointer events. */}
      <ul aria-hidden="true" className="preserve-3d pointer-events-none relative m-0 list-none p-0">
        {projects.map((project, i) => (
          <li
            key={project.slug}
            ref={(el) => {
              rowRefs.current[i] = el
            }}
            data-active={active === i}
            style={{ transformOrigin: '18% 50%', opacity: 0 }}
            className="will-transform flex h-[var(--row-h)] items-center gap-3 pl-8 pr-5 md:gap-8 md:pl-16 md:pr-10"
          >
            <span className="row-index w-7 shrink-0 self-start pt-[0.9em] font-display text-xs tabular-nums text-accent transition-colors duration-500 md:w-12 md:text-sm">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="row-title font-display text-[clamp(3rem,19vw,5.5rem)] font-bold uppercase leading-[0.9] tracking-tightest md:whitespace-nowrap md:text-[clamp(2.8rem,13.5vw,14rem)]">
              {project.title}
            </span>
            <span className="row-meta hidden shrink-0 self-end pb-[0.9em] font-display text-xs uppercase leading-relaxed tracking-[0.18em] text-ink/70 transition-colors duration-500 md:block">
              {project.year}
              <br />
              {project.tags[0]}
            </span>
          </li>
        ))}
      </ul>

      {/* Layer 2 — flat hit areas: one real, keyboard-focusable link per row. */}
      <nav aria-label={t('home.selected')} className="absolute inset-0 z-10">
        <ul className="m-0 list-none p-0">
          {projects.map((project, i) => (
            <li key={project.slug} className="h-[var(--row-h)]">
              <TransitionLink
                to={`/projects/${project.slug}`}
                label={project.title}
                className="block size-full"
                onPointerEnter={(e) => {
                  prefetch(project.slug)
                  if (e.pointerType === 'mouse') activate(i)
                }}
                onPointerLeave={() => activate(null)}
                onFocus={() => {
                  prefetch(project.slug)
                  activate(i)
                }}
                onBlur={() => activate(null)}
              >
                <span className="sr-only">
                  {t('home.open')}: {project.title}, {project.year}
                  {project.tags.length ? `, ${project.tags.join(', ')}` : ''}
                </span>
              </TransitionLink>
            </li>
          ))}
        </ul>
      </nav>

      <ProjectPreview project={active === null ? null : (projects[active] ?? null)} enabled={finePointer && !reduced} />
    </div>
  )
}

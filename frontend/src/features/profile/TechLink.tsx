import { findTech } from './techCatalog'

/** One stack item: an icon button to the technology's official site, or a plain chip when it isn't catalogued. */
export function TechLink({ name }: { name: string }) {
  const tech = findTech(name)
  const base =
    'flex min-h-[5.25rem] w-[5.25rem] flex-col items-center justify-center gap-2 border border-ink/20 px-1.5 py-3 text-center text-[0.7rem] leading-tight'

  if (!tech) {
    return <span className={`${base} text-ink/80`}>{name}</span>
  }
  return (
    <a
      href={tech.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} (${new URL(tech.url).hostname})`}
      title={name}
      className={`${base} group text-ink/80 transition-colors duration-300 hover:border-accent hover:bg-accent hover:text-primary focus-visible:border-accent focus-visible:bg-accent focus-visible:text-primary`}
    >
      <svg viewBox="0 0 24 24" className="size-7 fill-current" aria-hidden="true">
        <path d={tech.path} />
      </svg>
      <span className="break-words">{name}</span>
    </a>
  )
}

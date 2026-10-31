import { Link } from 'react-router-dom'
import { useI18n } from '@/features/i18n/I18nProvider'
import type { ProfilePublic } from '@/types/api'

export function Footer({ profile }: { profile: ProfilePublic | undefined }) {
  const { t } = useI18n()
  return (
    <footer className="border-t border-ink/15 px-5 pb-28 pt-12 md:px-10 md:pb-12">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-3">{t('profile.contact')}</p>
          {profile?.email && (
            <a
              href={`mailto:${profile.email}`}
              className="link-underline font-display text-2xl font-medium tracking-tight md:text-4xl"
            >
              {profile.email}
            </a>
          )}
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/80">
            {profile?.links.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-underline">
                  {link.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2 text-xs text-ink/55 md:items-end">
          <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <Link to="/admin" className="link-underline w-fit opacity-70 hover:opacity-100">
            admin
          </Link>
        </div>
      </div>
    </footer>
  )
}

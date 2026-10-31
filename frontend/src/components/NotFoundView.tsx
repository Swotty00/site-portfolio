import { useI18n } from '@/features/i18n/I18nProvider'
import { TransitionLink } from '@/features/transitions/TransitionProvider'

export function NotFoundView() {
  const { t } = useI18n()
  return (
    <section role="alert" className="flex min-h-svh flex-col justify-center gap-6 px-5 md:px-10">
      <p className="eyebrow">404</p>
      <h1 className="text-outline font-display text-[clamp(3rem,12vw,11rem)] font-bold uppercase leading-[0.9] tracking-tightest">
        {t('error.notFound')}
      </h1>
      <TransitionLink to="/" label={t('nav.work')} className="btn w-fit">
        ← {t('error.backHome')}
      </TransitionLink>
    </section>
  )
}

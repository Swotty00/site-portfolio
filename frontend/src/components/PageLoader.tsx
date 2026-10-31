import { useI18n } from '@/features/i18n/I18nProvider'

export function PageLoader() {
  const { t } = useI18n()
  return (
    <div role="status" className="flex min-h-[60svh] items-center justify-center">
      <span className="sr-only">{t('common.loading')}</span>
      <span aria-hidden="true" className="relative block h-px w-40 overflow-hidden bg-ink/20">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-[loader_1.1s_cubic-bezier(.65,0,.35,1)_infinite] bg-accent" />
      </span>
    </div>
  )
}

import { useI18n } from '@/features/i18n/I18nProvider'
import { ApiError } from '@/services/http'

interface Props {
  error: unknown
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, onRetry, className = '' }: Props) {
  const { t } = useI18n()
  const network = error instanceof ApiError && error.isNetwork
  return (
    <div role="alert" className={`mx-auto flex max-w-xl flex-col items-start gap-5 px-5 py-24 md:px-10 ${className}`}>
      <p className="eyebrow">{error instanceof ApiError && error.status ? `Error ${error.status}` : 'Error'}</p>
      <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-tightest md:text-6xl">
        {t('error.title')}
      </h2>
      <p className="text-ink/75">{network ? t('error.network') : (error as Error)?.message || t('error.title')}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {t('error.retry')}
        </button>
      )}
    </div>
  )
}

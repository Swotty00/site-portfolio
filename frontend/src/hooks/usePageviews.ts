import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '@/features/i18n/I18nProvider'
import { trackPageview } from '@/services/analytics'

/** Reports one page view per navigation (not per language switch). Mount it in the public layout. */
export function usePageviews() {
  const { pathname, key } = useLocation()
  const { locale } = useI18n()
  const localeRef = useRef(locale)
  localeRef.current = locale

  useEffect(() => {
    trackPageview(pathname, localeRef.current, key)
  }, [pathname, key])
}

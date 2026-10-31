import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultMessages, loadMessages, type MessageKey, type Messages } from '@/locales'
import { DEFAULT_LOCALE, LOCALE_META, type LocaleCode } from '@/types/i18n'
import { browserLanguages, detectLocale, readSavedLocale, saveLocale } from './detect'

type Vars = Record<string, string | number>

interface I18nContextValue {
  locale: LocaleCode
  setLocale: (locale: LocaleCode) => void
  t: (key: MessageKey, vars?: Vars) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) node = (node as Record<string, unknown>)[part]
    else return undefined
  }
  return typeof node === 'string' ? node : undefined
}

// eslint-disable-next-line react-refresh/only-export-components
export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => detectLocale(browserLanguages(), readSavedLocale()))
  // Messages for the active locale; null until its chunk has loaded (pt-BR is instant).
  const [messages, setMessages] = useState<Messages | null>(locale === DEFAULT_LOCALE ? defaultMessages : null)
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false
    void loadMessages(locale).then((loaded) => {
      if (!cancelled) setMessages(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale].htmlLang
  }, [locale])

  const setLocale = useCallback(
    (next: LocaleCode) => {
      saveLocale(next)
      setLocaleState(next)
      // Server content is localized per request; drop stale translations from the cache.
      void queryClient.invalidateQueries({ queryKey: ['content'] })
    },
    [queryClient],
  )

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => {
      const text = (messages && lookup(messages, key)) ?? lookup(defaultMessages, key) ?? key
      return interpolate(text, vars)
    },
    [messages],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  // Avoid a flash of Portuguese for visitors whose language chunk is still loading.
  if (!messages) return <div className="min-h-svh bg-primary" aria-busy="true" />

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

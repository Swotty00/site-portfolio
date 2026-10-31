import { DEFAULT_LOCALE, isLocale, SUPPORTED_LOCALES, type LocaleCode } from '@/types/i18n'

export const STORAGE_KEY = 'portfolio.locale'

const BY_LOWERCASE = new Map<string, LocaleCode>(SUPPORTED_LOCALES.map((l) => [l.toLowerCase(), l]))
// Base language -> supported variant ("pt" and "pt-PT" both map to pt-BR, "zh-TW" to zh, ...).
const BY_BASE = new Map<string, LocaleCode>(SUPPORTED_LOCALES.map((l) => [l.split('-')[0]!.toLowerCase(), l]))

/** Map one BCP-47 tag (as found in navigator.languages) to a supported locale, if any. */
export function matchLocale(tag: string): LocaleCode | null {
  const normalized = tag.trim().replace('_', '-').toLowerCase()
  if (!normalized) return null
  return BY_LOWERCASE.get(normalized) ?? BY_BASE.get(normalized.split('-')[0]!) ?? null
}

/**
 * Pick the initial locale: a previously saved choice wins, then the first browser language
 * that we support (in the user's preference order), then the default (pt-BR).
 */
export function detectLocale(browserLanguages: readonly string[], saved?: string | null): LocaleCode {
  if (isLocale(saved)) return saved
  for (const tag of browserLanguages) {
    const match = matchLocale(tag)
    if (match) return match
  }
  return DEFAULT_LOCALE
}

export function readSavedLocale(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // storage can be blocked (private mode, strict privacy settings)
  }
}

export function saveLocale(locale: LocaleCode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
}

export function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? navigator.languages : [navigator.language]
}

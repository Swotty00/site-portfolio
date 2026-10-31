export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es', 'it', 'fr', 'ru', 'zh', 'ja'] as const
export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: LocaleCode = 'pt-BR'

export interface LocaleMeta {
  /** Name of the language in that language. */
  native: string
  /** Short label for the switcher button. */
  short: string
  /** Value for <html lang>. */
  htmlLang: string
}

export const LOCALE_META: Record<LocaleCode, LocaleMeta> = {
  'pt-BR': { native: 'Português (Brasil)', short: 'PT', htmlLang: 'pt-BR' },
  en: { native: 'English', short: 'EN', htmlLang: 'en' },
  es: { native: 'Español', short: 'ES', htmlLang: 'es' },
  it: { native: 'Italiano', short: 'IT', htmlLang: 'it' },
  fr: { native: 'Français', short: 'FR', htmlLang: 'fr' },
  ru: { native: 'Русский', short: 'RU', htmlLang: 'ru' },
  zh: { native: '中文', short: 'ZH', htmlLang: 'zh-Hans' },
  ja: { native: '日本語', short: 'JA', htmlLang: 'ja' },
}

export function isLocale(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

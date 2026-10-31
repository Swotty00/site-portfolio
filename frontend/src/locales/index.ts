import { DEFAULT_LOCALE, type LocaleCode } from '@/types/i18n'
import ptBR, { type Messages } from './pt-BR'

export type { MessageKey, Messages } from './pt-BR'

/** pt-BR ships in the main bundle (it is the fallback); the rest load on demand. */
const loaders: Record<LocaleCode, () => Promise<{ default: Messages }>> = {
  'pt-BR': () => Promise.resolve({ default: ptBR }),
  en: () => import('./en'),
  es: () => import('./es'),
  it: () => import('./it'),
  fr: () => import('./fr'),
  ru: () => import('./ru'),
  zh: () => import('./zh'),
  ja: () => import('./ja'),
}

export const defaultMessages: Messages = ptBR

export async function loadMessages(locale: LocaleCode): Promise<Messages> {
  try {
    return (await loaders[locale]()).default
  } catch (error) {
    console.error(`Failed to load "${locale}" messages, falling back to ${DEFAULT_LOCALE}`, error)
    return ptBR
  }
}

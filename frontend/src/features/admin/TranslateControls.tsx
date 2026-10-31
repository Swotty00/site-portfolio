import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { adminApi } from '@/services/admin'
import type { LocaleCode } from '@/types/i18n'
import { errorMessage } from './errors'
import { Banner } from './ui'

interface Props {
  locale: LocaleCode
  /** Strings that would be sent for translation (from the pt-BR source). */
  texts: string[]
  /** True when the target language already has text that would be overwritten. */
  hasExisting: boolean
  onTranslated: (translated: string[]) => void
  /** Fallback: copy the Portuguese text as-is. */
  onCopy: () => void
}

/** "Translate from pt-BR" + "Copy without translating", shared by the profile and project editors. */
export function TranslateControls({ locale, texts, hasExisting, onTranslated, onCopy }: Props) {
  const status = useQuery({
    queryKey: ['admin', 'translate-status'],
    queryFn: adminApi.translateStatus,
    staleTime: 60_000,
    retry: false,
  })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const notConfigured = status.data?.enabled === false

  const confirmOverwrite = () =>
    !hasExisting || window.confirm(`Replace the existing ${locale} text with a new translation from pt-BR?`)

  const translate = async () => {
    if (!confirmOverwrite()) return
    setBusy(true)
    setNote(null)
    try {
      const res = await adminApi.translate(texts, locale)
      onTranslated(res.texts)
      setNote({
        kind: 'success',
        text: `Translated ${texts.length} text${texts.length === 1 ? '' : 's'} with ${res.model}. Review the result, then save.`,
      })
    } catch (err) {
      setNote({ kind: 'error', text: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const copy = () => {
    if (!confirmOverwrite()) return
    onCopy()
    setNote({ kind: 'success', text: 'Copied the pt-BR text without translating.' })
  }

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={busy || texts.length === 0 || notConfigured}
          onClick={() => void translate()}
        >
          {busy ? 'Translating…' : `Translate from pt-BR → ${locale}`}
        </button>
        <button type="button" className="admin-btn" disabled={busy} onClick={copy}>
          Copy without translating
        </button>
      </div>
      {notConfigured && (
        <p className="text-xs text-ink/60">
          AI translation is off: set <code>ANTHROPIC_API_KEY</code> in the backend environment and restart the API.
        </p>
      )}
      {note && <Banner kind={note.kind}>{note.text}</Banner>}
    </div>
  )
}

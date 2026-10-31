import { useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { adminApi } from '@/services/admin'
import { errorMessage } from './errors'
import { LOCALE_META, SUPPORTED_LOCALES, type LocaleCode } from '@/types/i18n'

export function Banner({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const tone =
    kind === 'error'
      ? 'border-red-300/50 bg-red-400/10 text-red-100'
      : 'border-emerald-300/50 bg-emerald-400/10 text-emerald-100'
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`whitespace-pre-line rounded-md border px-4 py-3 text-sm ${tone}`}
    >
      {children}
    </div>
  )
}

interface FieldProps {
  label: string
  hint?: string
  children: (id: string) => ReactNode
  className?: string
}

export function Field({ label, hint, children, className = '' }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  )
}

export function TextField({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <input id={id} className="field-input" {...props} />}
    </Field>
  )
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string; className?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => <textarea id={id} rows={4} className="field-input resize-y" {...props} />}
    </Field>
  )
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-ink/20 bg-ink/[0.04] p-5 md:p-6">
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && (
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-accent">{title}</h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

/** Tabs for the eight content languages; a dot marks languages that already have content. */
export function LocaleTabs({
  value,
  onChange,
  filled,
}: {
  value: LocaleCode
  onChange: (l: LocaleCode) => void
  filled: (l: LocaleCode) => boolean
}) {
  return (
    <div role="tablist" aria-label="Content language" className="mb-5 flex flex-wrap gap-2">
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          role="tab"
          aria-selected={code === value}
          onClick={() => onChange(code)}
          className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
            code === value ? 'border-accent bg-accent text-primary' : 'border-ink/30 hover:border-accent'
          }`}
        >
          {LOCALE_META[code].short}
          <span
            aria-label={filled(code) ? 'has content' : 'empty'}
            className={`size-1.5 rounded-full ${filled(code) ? 'bg-emerald-400' : 'bg-ink/25'}`}
          />
        </button>
      ))}
    </div>
  )
}

/** Generic add/remove/reorder editor for lists of sub-objects. */
export function ListEditor<T>({
  items,
  onChange,
  create,
  addLabel,
  render,
}: {
  items: T[]
  onChange: (items: T[]) => void
  create: () => T
  addLabel: string
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-ink/15 bg-primary/40 p-4">
          {render(item, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))), i)}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="admin-btn !px-2.5 !py-1 text-xs"
              onClick={() => move(i, i - 1)}
              disabled={i === 0}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="admin-btn !px-2.5 !py-1 text-xs"
              onClick={() => move(i, i + 1)}
              disabled={i === items.length - 1}
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-danger !px-2.5 !py-1 text-xs"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="admin-btn" onClick={() => onChange([...items, create()])}>
        + {addLabel}
      </button>
    </div>
  )
}

/** URL/path input with an "Upload" button that stores the file on the server. */
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onChange(await adminApi.uploadImage(file))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <Field label={label}>
        {(id) => (
          <div className="flex gap-2">
            <input
              id={id}
              className="field-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://… or /uploads/…"
            />
            <button
              type="button"
              className="admin-btn shrink-0"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? 'Uploading…' : 'Upload'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </div>
        )}
      </Field>
      {value && <img src={value} alt="" className="mt-2 h-24 rounded-md border border-ink/20 object-cover" />}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}

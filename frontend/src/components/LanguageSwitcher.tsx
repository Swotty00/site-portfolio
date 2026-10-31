import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useI18n } from '@/features/i18n/I18nProvider'
import { LOCALE_META, SUPPORTED_LOCALES } from '@/types/i18n'

/** Fixed top-right language picker (menu-button pattern, fully keyboard operable). */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    itemRefs.current[SUPPORTED_LOCALES.indexOf(locale)]?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, locale])

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) buttonRef.current?.focus()
  }

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[]
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus()
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      case 'ArrowDown':
        event.preventDefault()
        focusAt(current + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusAt(current - 1)
        break
      case 'Home':
        event.preventDefault()
        focusAt(0)
        break
      case 'End':
        event.preventDefault()
        focusAt(items.length - 1)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className="fixed right-4 top-4 z-[55] md:right-8 md:top-6">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t('lang.label')}: ${LOCALE_META[locale].native}`}
        onClick={() => setOpen((o) => !o)}
        className="group flex h-10 items-center gap-2 rounded-full border border-ink/35 bg-primary/55 px-3.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-ink backdrop-blur-md transition-colors hover:border-accent hover:text-accent"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.5 12h19M12 2.5c2.8 3 4.2 6.2 4.2 9.5s-1.4 6.5-4.2 9.5c-2.8-3-4.2-6.2-4.2-9.5S9.2 5.5 12 2.5Z" />
        </svg>
        <span>{LOCALE_META[locale].short}</span>
      </button>

      <ul
        id={menuId}
        role="menu"
        aria-label={t('lang.label')}
        onKeyDown={onMenuKeyDown}
        data-open={open}
        className="invisible absolute right-0 mt-2 w-56 origin-top-right scale-95 overflow-hidden rounded-2xl border border-ink/25 bg-primary/90 py-1.5 opacity-0 shadow-2xl backdrop-blur-xl transition duration-200 ease-out-expo data-[open=true]:visible data-[open=true]:scale-100 data-[open=true]:opacity-100"
      >
        {SUPPORTED_LOCALES.map((code, i) => (
          <li key={code} role="none">
            <button
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              lang={LOCALE_META[code].htmlLang}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setLocale(code)
                close(true)
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink/10 focus-visible:bg-ink/10 aria-checked:text-accent"
            >
              <span>{LOCALE_META[code].native}</span>
              <span className="font-display text-[0.65rem] uppercase tracking-[0.2em] opacity-60">
                {LOCALE_META[code].short}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

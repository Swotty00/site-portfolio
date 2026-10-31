import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { interpolate, I18nProvider, useI18n } from './I18nProvider'

function Probe() {
  const { t, locale, setLocale } = useI18n()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="text">{t('nav.about')}</span>
      <span data-testid="vars">{t('project.slide', { current: 2, total: 5 })}</span>
      <button onClick={() => setLocale('ja')}>ja</button>
    </div>
  )
}

function renderWithProviders() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider>
        <Probe />
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('interpolate', () => {
  it('replaces known variables and leaves unknown ones intact', () => {
    expect(interpolate('Hi {{name}} {{ n }}', { name: 'A', n: 2 })).toBe('Hi A 2')
    expect(interpolate('Hi {{missing}}', { name: 'A' })).toBe('Hi {{missing}}')
    expect(interpolate('plain')).toBe('plain')
  })
})

describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('detects the browser language on first load', async () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['it-IT', 'en'])
    renderWithProviders()
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('it'))
    expect(screen.getByTestId('text')).toHaveTextContent('chi sono')
    expect(document.documentElement.lang).toBe('it')
  })

  it('falls back to pt-BR for unsupported languages', async () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['de-DE'])
    renderWithProviders()
    expect(await screen.findByTestId('locale')).toHaveTextContent('pt-BR')
    expect(screen.getByTestId('text')).toHaveTextContent('sobre')
    expect(screen.getByTestId('vars')).toHaveTextContent('Imagem 2 de 5')
  })

  it('switches language, updates <html lang> and persists the choice', async () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['en-US'])
    renderWithProviders()
    expect(await screen.findByTestId('text')).toHaveTextContent('about')

    await act(async () => screen.getByText('ja').click())
    await waitFor(() => expect(screen.getByTestId('text')).toHaveTextContent('自己紹介'))
    expect(document.documentElement.lang).toBe('ja')
    expect(window.localStorage.getItem('portfolio.locale')).toBe('ja')
  })
})

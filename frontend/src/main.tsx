import '@fontsource-variable/dm-sans'
import '@fontsource-variable/space-grotesk'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { I18nProvider } from './features/i18n/I18nProvider'
import { SmoothScrollProvider } from './features/scroll/SmoothScrollProvider'
import { ThemeProvider } from './features/theme/ThemeProvider'
import { TransitionProvider } from './features/transitions/TransitionProvider'
import { ApiError } from './services/http'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Retry transient failures only: a 404/401/422 will not fix itself.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <BrowserRouter>
              <SmoothScrollProvider>
                <TransitionProvider>
                  <App />
                </TransitionProvider>
              </SmoothScrollProvider>
            </BrowserRouter>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Last line of defence: a render crash shows a recoverable message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex min-h-svh flex-col items-start justify-center gap-5 px-6 md:px-16">
        <p className="eyebrow">Error</p>
        <h1 className="font-display text-5xl font-bold uppercase tracking-tightest md:text-7xl">
          Something went wrong
        </h1>
        <button type="button" className="btn" onClick={() => window.location.assign('/')}>
          Reload
        </button>
      </div>
    )
  }
}

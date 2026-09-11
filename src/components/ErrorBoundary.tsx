import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error) {
    return { error, info: null }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <div className="flex max-w-lg flex-col gap-3">
            <h1 className="text-lg font-semibold text-foreground">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado nesta tela. Recarregue a página para continuar — se o problema persistir,
              envie o detalhe abaixo para quem cuida do sistema.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mx-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Recarregar página
            </button>
            <details className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">Detalhe do erro</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {this.state.error.message}
                {this.state.info?.componentStack ?? ''}
              </pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h1>Что-то пошло не так</h1>
            <p>
              Произошла ошибка в интерфейсе. Ваши данные сохранены в локальном хранилище браузера и не
              потеряны. Попробуйте перезагрузить страницу.
            </p>
            <pre>{this.state.error.message}</pre>
            <button type="button" onClick={() => window.location.reload()}>
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Ignore react-joyride removeChild errors (known React 18 issue)
    if (error?.name === 'NotFoundError' && error?.message?.includes('removeChild')) {
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
              Algo deu errado
            </h1>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Ocorreu um erro inesperado. Por favor, tente recarregar a página.
            </p>
            {this.state.error && (
              <pre style={{ 
                fontSize: '12px', 
                textAlign: 'left', 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '100px'
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                background: '#0C2340',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
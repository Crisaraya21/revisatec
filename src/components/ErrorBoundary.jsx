import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 30,
            maxWidth: 600,
            margin: '40px auto',
            backgroundColor: 'var(--bg-surface, #ffffff)',
            borderRadius: 12,
            border: '1.5px solid #f87171',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 10px 0', color: '#dc2626' }}>
            Ocurrió un error al cargar esta sección
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #4b5563)', marginBottom: 20 }}>
            {this.state.error?.message || 'Error inesperado de renderizado.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#396fa2',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

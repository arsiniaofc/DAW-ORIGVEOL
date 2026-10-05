import React, { Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AetherDAW Uncaught Runtime Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', backgroundColor: '#0b0d14', color: '#f43f5e', fontFamily: 'monospace', minHeight: '100vh', boxSizing: 'border-box' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#141824', padding: '24px', borderRadius: '8px', border: '1px solid #3b82f640' }}>
            <h1 style={{ fontSize: '20px', color: '#38bdf8', marginTop: 0, marginBottom: '12px' }}>AetherDAW Application Diagnostics</h1>
            <p style={{ color: '#f43f5e', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>
              {this.state.error?.toString() || 'An error occurred during application initialization.'}
            </p>
            <pre style={{ backgroundColor: '#090b10', padding: '16px', borderRadius: '6px', color: '#93c5fd', overflow: 'auto', fontSize: '12px', border: '1px solid #232d42', maxHeight: '350px' }}>
              {this.state.error?.stack || 'No stack trace available.'}
            </pre>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Reload DAW
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } catch (e) {}
                  window.location.reload();
                }}
                style={{ padding: '10px 20px', backgroundColor: '#1f2937', color: '#d1d5db', border: '1px solid #374151', borderRadius: '4px', cursor: 'pointer' }}
              >
                Reset Local Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

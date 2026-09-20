import { StrictMode, ReactNode } from 'react';
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', padding: '20px', fontFamily: 'sans-serif', background: '#121212', height: '100vh', boxSizing: 'border-box' }}>
          <h2>Algo deu errado na inicialização.</h2>
          <pre style={{ color: '#ff7b72', whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '10px' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

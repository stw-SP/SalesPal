import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './services/AuthContext';
import './index.css';

// Global error handling to catch unhandled exceptions
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('Unhandled application error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log error to file system or error tracking service if available
    // This could be expanded to send errors to a backend endpoint
    try {
      localStorage.setItem('lastAppError', JSON.stringify({
        message: error.message,
        stack: error.stack,
        time: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Failed to save error to localStorage:', e);
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div style={{ 
          padding: '20px', 
          maxWidth: '800px', 
          margin: '0 auto', 
          fontFamily: 'Montserrat, sans-serif' 
        }}>
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '2px solid #CF292A'
          }}>
            <h2 style={{ color: '#CF292A' }}>
              <span style={{ marginRight: '10px' }}>⚠️</span>
              Something went wrong
            </h2>
            <p>We're sorry, but an unexpected error has occurred.</p>
            <div style={{ marginTop: '15px' }}>
              <button 
                onClick={this.handleRefresh}
                style={{
                  backgroundColor: '#60A630',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Refresh Application
              </button>
            </div>
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              borderLeft: '4px solid #CF292A',
              fontSize: '12px',
              overflowX: 'auto'
            }}>
              <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
              {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add a global unhandled promise rejection handler
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled Promise Rejection:', event.reason);
  
  // Optional: Display an error toast or notification here
  if (event.reason && event.reason.message) {
    // You could show a toast notification here
    alert(`An error occurred: ${event.reason.message}`);
  }
});

// Add error handling to console methods to track errors
const originalConsoleError = console.error;
console.error = function(...args) {
  // Call the original console.error
  originalConsoleError.apply(console, args);
  
  // Log to localStorage for debugging
  try {
    const errorLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
    errorLogs.push({
      type: 'error',
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      timestamp: new Date().toISOString()
    });
    // Keep only the last 20 errors
    while (errorLogs.length > 20) errorLogs.shift();
    localStorage.setItem('errorLogs', JSON.stringify(errorLogs));
  } catch (e) {
    // Silent fail for localStorage errors
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
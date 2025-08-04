import React from 'react';
import { AppProvider } from './context/AppContext';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import NotificationContainer from './components/ui/Notification';
import PageRouter from './components/PageRouter';

// Error Boundary for debugging
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('App-level error:', error);
    console.error('Error details:', errorInfo);
    console.error('Error stack:', error.stack);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Application Error</h1>
          <p className="text-red-700 mb-4">Error: {this.state.error?.message}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AppErrorBoundary>
  );
};

const AppContent = () => {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans">
      <Header />
      <Navigation />
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <PageRouter />
      </main>
      
      <NotificationContainer />
    </div>
  );
};

export default App;
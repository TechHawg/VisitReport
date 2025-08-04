import React, { Suspense } from 'react';
import { useApp } from '../context/AppContext';

// Import all pages
import Dashboard from '../pages/Dashboard/Dashboard';
import Summary from '../pages/Summary/Summary';
import OfficeGrading from '../pages/OfficeGrading/OfficeGrading';
import Infrastructure from '../pages/Infrastructure/Infrastructure';
import IssuesActions from '../pages/IssuesActions/IssuesActions';
import Admin from '../pages/Admin/Admin';

// Lazy load heavy components for better performance
const Inventory = React.lazy(() => import('../pages/Inventory/Inventory'));
const Storage = React.lazy(() => import('../pages/Storage/Storage'));
const ImportExport = React.lazy(() => import('../components/ImportExport/ImportExport'));

// Loading component for suspense
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
  </div>
);

// Error boundary for page components
class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Page error:', error, errorInfo);
    console.error('Error stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-700 dark:text-red-300 text-sm mb-4">
            This page encountered an error and couldn't be displayed.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const PageRouter = () => {
  const { activePage } = useApp();

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Summary':
        return <Summary />;
      case 'OfficeGrading':
        return <OfficeGrading />;
      case 'Infrastructure':
        return <Infrastructure />;
      case 'Inventory':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Inventory />
          </Suspense>
        );
      case 'Storage':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <Storage />
          </Suspense>
        );
      case 'IssuesActions':
        return <IssuesActions />;
      case 'ImportExport':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ImportExport />
          </Suspense>
        );
      case 'Admin':
        return <Admin />;
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The requested page "{activePage}" could not be found.
            </p>
          </div>
        );
    }
  };

  return (
    <PageErrorBoundary>
      <div className="animate-fade-in">
        {renderPage()}
      </div>
    </PageErrorBoundary>
  );
};

export default PageRouter;
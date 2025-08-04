import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useApp } from '../AppContext';
import { createMaliciousInput } from '../../test/utils/test-utils';

// Test component to access context
const TestComponent = () => {
  const {
    theme,
    activePage,
    reportData,
    isLoading,
    notifications,
    toggleTheme,
    setActivePage,
    updateReportData,
    addNotification,
    setLoading
  } = useApp();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="active-page">{activePage}</div>
      <div data-testid="office">{reportData.office}</div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="notifications-count">{notifications.length}</div>
      
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setActivePage('Summary')}>Set Page</button>
      <button onClick={() => updateReportData('office', 'New Office')}>
        Update Office
      </button>
      <button onClick={() => addNotification({ type: 'success', message: 'Test' })}>
        Add Notification
      </button>
      <button onClick={() => setLoading(true)}>Set Loading</button>
    </div>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides initial state correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('active-page')).toHaveTextContent('Dashboard');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('0');
  });

  it('toggles theme correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    
    await user.click(screen.getByText('Toggle Theme'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    
    await user.click(screen.getByText('Toggle Theme'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('changes active page correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await user.click(screen.getByText('Set Page'));
    expect(screen.getByTestId('active-page')).toHaveTextContent('Summary');
  });

  it('updates report data correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await user.click(screen.getByText('Update Office'));
    expect(screen.getByTestId('office')).toHaveTextContent('New Office');
  });

  it('sanitizes input data', async () => {
    const user = userEvent.setup();
    
    const TestInputSanitization = () => {
      const { reportData, updateReportData } = useApp();
      
      return (
        <div>
          <div data-testid="office-value">{reportData.office}</div>
          <button 
            onClick={() => updateReportData('office', createMaliciousInput.xss)}
          >
            Add XSS
          </button>
        </div>
      );
    };

    render(
      <AppProvider>
        <TestInputSanitization />
      </AppProvider>
    );

    await user.click(screen.getByText('Add XSS'));
    
    // Should sanitize the malicious input
    const officeValue = screen.getByTestId('office-value').textContent;
    expect(officeValue).not.toContain('<script>');
    expect(officeValue).not.toContain('alert');
  });

  it('adds and manages notifications', async () => {
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('notifications-count')).toHaveTextContent('0');
    
    await user.click(screen.getByText('Add Notification'));
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('1');
  });

  it('manages loading state', async () => {
    const user = userEvent.setup();
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    
    await user.click(screen.getByText('Set Loading'));
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('loads data from localStorage on mount', () => {
    const savedData = {
      office: 'Saved Office',
      date: '2023-10-01',
      visitPurpose: 'Saved Purpose',
      summary: 'Saved Summary'
    };
    
    localStorage.setItem('officeVisitReport', JSON.stringify(savedData));
    
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('office')).toHaveTextContent('Saved Office');
  });

  it('handles localStorage errors gracefully', () => {
    // Mock localStorage to throw an error
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = vi.fn(() => {
      throw new Error('Storage error');
    });

    // Should not throw and should use initial state
    expect(() => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );
    }).not.toThrow();

    // Restore original function
    localStorage.getItem = originalGetItem;
  });

  it('throws error when useApp is used outside provider', () => {
    // Mock console.error to prevent test noise
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useApp must be used within an AppProvider');

    console.error = originalError;
  });
});
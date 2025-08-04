import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppProvider, useApp } from '../context/AppContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Test component that uses the theme context
const ThemeTestComponent = () => {
  const { theme, toggleTheme } = useApp();
  
  return (
    <div>
      <div data-testid="theme-indicator">Current theme: {theme}</div>
      <button data-testid="toggle-button" onClick={toggleTheme}>
        Toggle Theme
      </button>
      <div className={theme === 'dark' ? 'dark-mode-active' : 'light-mode-active'}>
        Theme dependent content
      </div>
    </div>
  );
};

describe('Theme Toggle Functionality', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Mock console.error to suppress expected errors in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should have light theme as default', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <AppProvider>
        <ThemeTestComponent />
      </AppProvider>
    );
    
    expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current theme: light');
  });

  it('should toggle theme from light to dark', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <AppProvider>
        <ThemeTestComponent />
      </AppProvider>
    );
    
    const toggleButton = screen.getByTestId('toggle-button');
    const themeIndicator = screen.getByTestId('theme-indicator');
    
    // Initial state should be light
    expect(themeIndicator).toHaveTextContent('Current theme: light');
    
    // Click to toggle to dark
    fireEvent.click(toggleButton);
    
    // Should now be dark
    expect(themeIndicator).toHaveTextContent('Current theme: dark');
  });

  it('should toggle theme from dark to light', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    
    render(
      <AppProvider>
        <ThemeTestComponent />
      </AppProvider>
    );
    
    const toggleButton = screen.getByTestId('toggle-button');
    const themeIndicator = screen.getByTestId('theme-indicator');
    
    // Should start with dark theme from localStorage
    expect(themeIndicator).toHaveTextContent('Current theme: dark');
    
    // Click to toggle to light
    fireEvent.click(toggleButton);
    
    // Should now be light
    expect(themeIndicator).toHaveTextContent('Current theme: light');
  });

  it('should persist theme to localStorage when changed', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(
      <AppProvider>
        <ThemeTestComponent />
      </AppProvider>
    );
    
    const toggleButton = screen.getByTestId('toggle-button');
    
    // Toggle to dark theme
    fireEvent.click(toggleButton);
    
    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should load saved theme from localStorage on mount', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme') return 'dark';
      return null;
    });
    
    render(
      <AppProvider>
        <ThemeTestComponent />
      </AppProvider>
    );
    
    // Should load dark theme from localStorage
    expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current theme: dark');
  });

  it('should ignore invalid theme values from localStorage', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'theme') return 'invalid-theme';
      return null;
    });
    
    render(
      <AppProvider>
        <ThemeTestComponent />
      </AppProvider>
    );
    
    // Should fallback to default light theme
    expect(screen.getByTestId('theme-indicator')).toHaveTextContent('Current theme: light');
  });
});
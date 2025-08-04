import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppProvider } from '../context/AppContext';
import Header from '../components/layout/Header';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

describe('Theme DOM Integration', () => {
  beforeEach(() => {
    // Clear all mocks and DOM classes before each test
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
    
    // Mock console methods to suppress expected errors/warnings in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should apply dark class to document element when theme is dark', async () => {
    localStorageMock.getItem.mockReturnValue('dark');
    
    render(
      <AppProvider>
        <Header />
      </AppProvider>
    );
    
    // Wait for useEffect to run
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should remove dark class from document element when theme is light', async () => {
    // Start with dark class applied
    document.documentElement.classList.add('dark');
    localStorageMock.getItem.mockReturnValue('light');
    
    render(
      <AppProvider>
        <Header />
      </AppProvider>
    );
    
    // Wait for useEffect to run
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should toggle DOM class when theme toggle button is clicked', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const { container } = render(
      <AppProvider>
        <Header />
      </AppProvider>
    );
    
    // Find the theme toggle button (it has an aria-label that mentions switching theme)
    const themeButton = container.querySelector('button[aria-label*="Switch to"]');
    expect(themeButton).not.toBeNull();
    
    // Initially should not have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    // Click the theme toggle button
    fireEvent.click(themeButton);
    
    // Wait for the DOM class to be applied
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
    
    // Click again to toggle back
    fireEvent.click(themeButton);
    
    // Wait for the DOM class to be removed
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should persist theme changes to localStorage when DOM class changes', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const { container } = render(
      <AppProvider>
        <Header />
      </AppProvider>
    );
    
    const themeButton = container.querySelector('button[aria-label*="Switch to"]');
    
    // Click to switch to dark theme
    fireEvent.click(themeButton);
    
    // Wait for localStorage to be called
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
    
    // Click to switch back to light theme
    fireEvent.click(themeButton);
    
    // Wait for localStorage to be called again
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  it('should display correct icon based on current theme', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const { container } = render(
      <AppProvider>
        <Header />
      </AppProvider>
    );
    
    const themeButton = container.querySelector('button[aria-label*="Switch to"]');
    
    // In light mode, should show Moon icon (to switch to dark)
    expect(themeButton.getAttribute('aria-label')).toContain('Switch to dark mode');
    
    // Click to switch to dark theme
    fireEvent.click(themeButton);
    
    // In dark mode, should show Sun icon (to switch to light)
    await waitFor(() => {
      expect(themeButton.getAttribute('aria-label')).toContain('Switch to light mode');
    });
  });
});
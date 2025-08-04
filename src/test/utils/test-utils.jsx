import React from 'react';
import { render } from '@testing-library/react';
import { AppProvider } from '../../context/AppContext';

// Custom render function that includes AppProvider
export const renderWithProvider = (ui, options = {}) => {
  const { initialState, ...renderOptions } = options;

  const Wrapper = ({ children }) => (
    <AppProvider initialState={initialState}>
      {children}
    </AppProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Test data factory functions
export const createMockReportData = (overrides = {}) => ({
  office: 'Test Office',
  date: '2023-10-01',
  visitPurpose: 'Routine maintenance',
  summary: 'Test visit summary',
  itInfrastructure: {
    servers: [],
    workstations: [],
    networkEquipment: []
  },
  inventory: [],
  recycling: [],
  issues: [],
  recommendations: [],
  ...overrides
});

export const createMockInfrastructureItem = (overrides = {}) => ({
  id: Date.now(),
  name: 'Test Server',
  model: 'Dell PowerEdge R740',
  serialNumber: 'ABC123',
  ipAddress: '192.168.1.100',
  status: 'active',
  notes: 'Test notes',
  lastUpdated: new Date().toISOString().split('T')[0],
  ...overrides
});

export const createMockNotification = (overrides = {}) => ({
  id: Date.now(),
  type: 'success',
  message: 'Test notification',
  duration: 3000,
  ...overrides
});

// Mock API responses
export const mockApiSuccess = (data) => 
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

export const mockApiError = (error) => 
  Promise.reject(new Error(error));

// Security testing helpers
export const createMaliciousInput = {
  xss: '<script>alert("xss")</script>',
  sqlInjection: "'; DROP TABLE users; --",
  pathTraversal: '../../../etc/passwd',
  htmlInjection: '<img src="x" onerror="alert(1)">',
  jsProtocol: 'javascript:alert(1)',
  dataUrl: 'data:text/html,<script>alert(1)</script>'
};

// Accessibility testing helpers
export const getAccessibleElements = (container) => ({
  headings: container.querySelectorAll('h1, h2, h3, h4, h5, h6'),
  buttons: container.querySelectorAll('button'),
  inputs: container.querySelectorAll('input, textarea, select'),
  links: container.querySelectorAll('a'),
  images: container.querySelectorAll('img')
});

export const checkAriaLabels = (elements) => {
  const missingLabels = [];
  elements.forEach((element, index) => {
    if (!element.getAttribute('aria-label') && 
        !element.getAttribute('aria-labelledby') &&
        !element.textContent.trim()) {
      missingLabels.push({ element, index });
    }
  });
  return missingLabels;
};
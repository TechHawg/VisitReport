import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts',
        'dist/',
        'public/',
        '**/*.stories.{js,jsx,ts,tsx}',
        'src/main.jsx'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    // Security: Prevent tests from running with production data
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:3001/test-api'
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
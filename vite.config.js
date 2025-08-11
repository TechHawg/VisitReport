import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  
  // GitHub Pages base path - update this to match your repository name
  const isGitHubPages = env.VITE_GITHUB_PAGES === 'true';
  const basePath = isGitHubPages ? '/RSS_Visit_Report/' : '/';

  // Backend API origin used for proxying in dev. Normalize trailing slash.
  const apiOrigin = ((env.VITE_API_URL && typeof env.VITE_API_URL === 'string') ? env.VITE_API_URL : 'http://localhost:3001').replace(/\/+$/, '');

  return {
    base: basePath,
    plugins: [react()],
    root: '.',
    publicDir: 'public',

    // Path resolution
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
        '@context': fileURLToPath(new URL('./src/context', import.meta.url)),
      }
    },

    // Development server configuration
    server: {
      port: parseInt(env.VITE_PORT || env.PORT) || 5173,
      host: env.VITE_HOST || 'localhost',
      https: env.VITE_HTTPS === 'true',
      open: env.VITE_OPEN === 'true',

      // Proxy API to backend to avoid CORS/CSP headaches in development
      proxy: apiOrigin && apiOrigin !== 'http://localhost:3001' ? {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
          timeout: 10000,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('Proxy error:', err.message);
            });
          }
        }
      } : {},

      headers: {
        // Security headers for development
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        // CSP for development (allow backend for connect-src and HMR)
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for dev HMR
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          `connect-src 'self' ${apiOrigin} ws: wss:`, // Allow backend API and websockets
          "media-src 'self'",
          "object-src 'none'",
          "frame-src 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; ')
      }
    },

    // Preview server configuration (for production build testing)
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT) || 4173,
      host: env.VITE_HOST || 'localhost',
      headers: {
        // Production-like security headers for preview
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        // Strict CSP for production preview
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "media-src 'self'",
          "object-src 'none'",
          "frame-src 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; ')
      }
    },

    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProduction, // Source maps only in development
      minify: isProduction ? 'terser' : false,

      // Advanced build optimizations
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Core React libraries
            'react-vendor': ['react', 'react-dom'],
            // Icon library
            'icons': ['lucide-react'],
            // Large pages (lazy loaded)
            'pages-heavy': [
              './src/pages/Inventory/Inventory.jsx',
              './src/pages/Storage/Storage.jsx',
              './src/pages/Recycling/Recycling.jsx'
            ]
          },
          // Asset naming for better caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|icon/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/css/i.test(ext)) {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          }
        }
      }
    }
  };
});
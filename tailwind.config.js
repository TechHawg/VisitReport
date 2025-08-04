/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom color palette for data racks
        rack: {
          blue: '#3b82f6',
          green: '#22c55e',
          orange: '#f97316',
          red: '#ef4444',
          purple: '#8b5cf6',
          yellow: '#facc15',
          gray: '#6b7280',
          white: '#ffffff',
        }
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
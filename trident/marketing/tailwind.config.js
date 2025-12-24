/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trident brand colors
        trident: {
          navy: '#1a365d',      // Deep ocean blue (primary)
          gold: '#d4af37',      // Trident gold (accent)
          blue: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          }
        },
        // Industry colors
        industry: {
          finance: '#10b981',     // emerald
          sales: '#f59e0b',       // amber
          hr: '#8b5cf6',          // violet
          healthcare: '#ef4444',  // red
          construction: '#f97316', // orange
          legal: '#6366f1',       // indigo
          realEstate: '#14b8a6',  // teal
          ecommerce: '#ec4899',   // pink
          professional: '#64748b', // slate
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}

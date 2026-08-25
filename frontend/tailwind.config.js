/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#E55C41',
          'orange-hover': '#D44E35',
          green: '#2A9D6A',
          maroon: '#641E16',
          'maroon-hover': '#4A1610',
          dark: '#0B0C10',
          darker: '#08080A',
          'dark-surface': '#14151A',
          'dark-border': '#262833',
          'dark-hover': '#1C1E26',
        },
        accent: {
          purple: {
            DEFAULT: '#5c4dce',
            light: '#f3efff',
          },
          blue: {
            DEFAULT: '#2583e8',
            light: '#eaf6ff',
          },
          red: {
            DEFAULT: '#e65c5c',
            light: '#fff0f0',
          },
        },
        theme: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          'surface-hover': 'var(--bg-surface-hover)',
          'surface-alt': 'var(--bg-surface-alt)',
          'table-header': 'var(--bg-table-header)',
          border: 'var(--border-default)',
          'border-hover': 'var(--border-hover)',
          main: 'var(--text-main)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
        }
      },
      keyframes: {
        'scroll-up': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(calc(-100% - 1rem))' },
        },
        'scroll-down': {
          '0%': { transform: 'translateY(calc(-100% - 1rem))' },
          '100%': { transform: 'translateY(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'scroll-up': 'scroll-up 40s linear infinite',
        'scroll-down': 'scroll-down 40s linear infinite',
        'shake': 'shake 0.2s ease-in-out 0s 2',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
      }
    },
  },
  plugins: [],
}


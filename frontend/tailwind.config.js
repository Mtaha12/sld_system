/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#E55C41',
          green: '#2A9D6A',
          dark: '#0B0C10',
          darker: '#08080A',
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


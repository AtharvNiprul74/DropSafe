/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dfe9ff',
          200: '#c5d7fe',
          300: '#a1bcfc',
          400: '#7b97f8',
          500: '#5b72f2',
          600: '#4550e6',
          700: '#383fcb',
          800: '#3037a4',
          900: '#2d3482',
          950: '#1b1d4e',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

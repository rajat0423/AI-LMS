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
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 12px 0 rgba(100, 100, 111, 0.04)',
        'premium': '0 8px 30px rgba(0, 0, 0, 0.03)',
        'premium-dark': '0 8px 30px rgba(0, 0, 0, 0.35)',
        'glow': '0 0 20px rgba(124, 58, 237, 0.12)',
      }
    },
  },
  plugins: [],
}

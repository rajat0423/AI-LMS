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
          50: '#eef2ff',
          100: '#dbe4ff',
          200: '#bfcfff',
          300: '#93aeff',
          400: '#6b8afc',
          500: '#4a6cf7',
          600: '#3451eb',
          700: '#2a3fd8',
          800: '#2535af',
          900: '#24328a',
          950: '#1a2054',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 12px 0 rgba(100, 100, 111, 0.06)',
      }
    },
  },
  plugins: [],
}

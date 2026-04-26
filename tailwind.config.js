/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#EEF2FF',
          800: '#FFFFFF',
          700: '#F5F7FF',
          600: '#E0E7FF',
        },
        safe: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        vox: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        pharmacy: {
          light: '#10b981',
          dark: '#059669',
        },
        paikari: {
          light: '#f59e0b',
          dark: '#d97706',
        },
        wholesale: {
          light: '#6366f1',
          dark: '#4f46e5',
        },
        mpo: {
          light: '#8b5cf6',
          dark: '#7c3aed',
        },
        food: {
          light: '#ef4444',
          dark: '#dc2626',
        },
      },
    },
  },
  plugins: [],
};

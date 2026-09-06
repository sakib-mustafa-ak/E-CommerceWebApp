/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7fa',
          100: '#d9edf4',
          200: '#b3dbe9',
          300: '#7fc2d9',
          400: '#4ba7c9',
          500: '#0F5B78',
          600: '#0d4f69',
          700: '#0b435a',
          800: '#09374b',
          900: '#072b3c',
          950: '#051f2d',
        },
        pharmacy: {
          light: '#059669',
          DEFAULT: '#047857',
          dark: '#065f46',
        },
        paikari: {
          light: '#d97706',
          DEFAULT: '#b45309',
          dark: '#92400e',
        },
        wholesale: {
          light: '#4f46e5',
          DEFAULT: '#4338ca',
          dark: '#3730a3',
        },
        mpo: {
          light: '#7c3aed',
          DEFAULT: '#6d28d9',
          dark: '#5b21b6',
        },
        food: {
          light: '#dc2626',
          DEFAULT: '#b91c1c',
          dark: '#991b1b',
        },
        gaming: {
          light: '#2563eb',
          DEFAULT: '#1d4ed8',
          dark: '#1e40af',
        },
        community: {
          light: '#0891b2',
          DEFAULT: '#0e7490',
          dark: '#155e75',
        },
        'offer-para': {
          light: '#ea580c',
          DEFAULT: '#c2410c',
          dark: '#9a3412',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};

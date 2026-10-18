/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1f9f0',
          100: '#ddf2db',
          200: '#bce5b8',
          300: '#8fd289',
          400: '#5cb854',
          500: '#3a9a32',
          600: '#2a7c24',
          700: '#22621e',
          800: '#1c4f1a',
          900: '#163f15',
          950: '#0a2509',
        },
        accent: {
          50: '#f4f7f1',
          100: '#e6ede0',
          200: '#cddbc3',
          300: '#a8c196',
          400: '#7fa063',
          500: '#5d8443',
          600: '#486b32',
          700: '#395528',
          800: '#2f4523',
          900: '#283a1f',
        },
        success: {
          50: '#eefbf3',
          500: '#16a34a',
          600: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          500: '#dc2626',
          600: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16,40,12,0.04), 0 1px 3px 0 rgba(16,40,12,0.06)',
        soft: '0 4px 16px -2px rgba(16,40,12,0.08)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        grey: {
          50: '#F7F8F9',
          100: '#EFF0F2',
          200: '#E2E3E5',
          300: '#C5C6CC',
          400: '#A7AAB2',
          500: '#8A8D99',
          600: '#6D717F',
          700: '#575A66',
          800: '#41444C',
          900: '#2C2D33',
        },
        brand: {
          DEFAULT: '#1A73E8',
          surface: '#F3F8FE',
          50: '#F3F8FE',
          200: '#D1E3FA',
          300: '#A3C7F6',
          400: '#76ABF1',
          500: '#488FED',
          600: '#1A73E8',
          700: '#155CBA',
          800: '#10458B',
          900: '#0A2E5D',
        },
        success: {
          DEFAULT: '#3BC884',
          surface: '#F5FCF9',
          deep: '#23784F',
        },
        warning: {
          DEFAULT: '#FB8145',
          surface: '#FFF9F5',
          deep: '#974D29',
        },
        errords: {
          DEFAULT: '#F31A1A',
          surface: '#FFF3F3',
          deep: '#921010',
        },
      },
      borderRadius: {
        ds: '12px',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'ds-sm': '0px 1px 2px rgba(44, 45, 51, 0.08)',
        'ds-md': '0px 2px 8px rgba(44, 45, 51, 0.10)',
        'ds-lg': '0px 4px 16px rgba(44, 45, 51, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config

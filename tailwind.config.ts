import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1A73E8',
          600: '#1A73E8',
          700: '#155FC2',
          800: '#104A99',
          hover: '#155FC2',
          pressed: '#104A99',
          surface: '#F3F8FE',
        },
        grey: {
          50: '#F7F8F9',
          100: '#EFF0F2',
          200: '#E3E5E8',
          300: '#C9CCD2',
          400: '#A9AEB8',
          500: '#8A8F9B',
          600: '#6D717F',
          700: '#555966',
          800: '#3F424C',
          900: '#2C2D33',
        },
        success: { DEFAULT: '#3BC884', surface: '#EBFAF3', deep: '#1E7A4F' },
        warning: { DEFAULT: '#FB8145', surface: '#FFF3EC', deep: '#B5511F' },
        errords: { DEFAULT: '#F31A1A', surface: '#FEEFEF', deep: '#A31212' },
      },
      boxShadow: {
        'ds-sm': '0 1px 2px rgba(44,45,51,0.08)',
        'ds-md': '0 2px 8px rgba(44,45,51,0.10)',
        'ds-lg': '0 4px 16px rgba(44,45,51,0.12)',
        'ds-xlg': '0 8px 32px rgba(44,45,51,0.16)',
      },
      borderRadius: {
        ds: '12px',
        'ds-lg': '16px',
      },
    },
  },
  plugins: [],
}

export default config

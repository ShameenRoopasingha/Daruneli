/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          DEFAULT: '#0D9488',
        },
        risk: {
          red: '#DC2626',
          'red-light': '#FEE2E2',
          yellow: '#D97706',
          'yellow-light': '#FEF3C7',
          green: '#16A34A',
          'green-light': '#DCFCE7',
          blue: '#2563EB',
          'blue-light': '#DBEAFE',
        },
      },
    },
  },
  plugins: [],
};

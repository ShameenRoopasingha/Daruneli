/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#1565C0',
        'primary-dark': '#0D47A1',
        danger: '#D32F2F',
        warning: '#F57F17',
        success: '#2E7D32',
        'risk-red': '#D32F2F',
        'risk-yellow': '#F9A825',
        'risk-green': '#2E7D32',
        surface: '#FFFFFF',
        'surface-alt': '#F5F5F5',
        'text-primary': '#212121',
        'text-secondary': '#757575',
      },
    },
  },
  plugins: [],
};

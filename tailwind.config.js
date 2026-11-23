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
        primary: '#0D9488',
        'primary-dark': '#0F766E',
        'primary-deep': '#115E59',
        'primary-light': '#F0FDFA',
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        'surface-subtle': '#F1F5F9',
        'surface-alt': '#F8FAFC',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        'text-tertiary': '#64748B',
        'risk-red': '#EF4444',
        'risk-yellow': '#D97706',
        'risk-green': '#10B981',
        danger: '#DC2626',
        warning: '#D97706',
        success: '#16A34A',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
        display: ['Satoshi', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        background: '#0E1116',
        surface: '#151A21',
        primary: {
          DEFAULT: '#5B8CFF',
          hover: '#4A7AE8',
        },
        secondary: {
          DEFAULT: '#3ED6C2',
          hover: '#2EC5B0',
        },
        text: {
          primary: '#E6EAF0',
          secondary: '#9BA1A6',
          tertiary: '#6B7280',
        },
        border: 'rgba(255, 255, 255, 0.1)',
        divider: 'rgba(255, 255, 255, 0.05)',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.2)',
        'elevation': '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        heading: ['Satoshi', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      backgroundColor: theme => ({
        ...theme('colors'),
        'elevated': 'var(--color-background-elevated)',
        'subtle': 'var(--color-background-subtle)',
        'surface': 'var(--color-background-surface)',
      }),
      colors: {
        // Background colors
        background: {
          DEFAULT: 'var(--color-background)',
          elevated: 'var(--color-background-elevated)',
          subtle: 'var(--color-background-subtle)',
          surface: 'var(--color-background-surface)',
        },
        // Text colors
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
        },
        // Border colors
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
          dark: 'var(--color-border-dark)',
        },
        // Status colors
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
        info: 'var(--color-info)',
        // Primary colors
        primary: {
          light: 'var(--color-primary-light)',
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
        },
        // Accent colors
        accent: {
          light: 'var(--color-accent-light)',
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-dark)',
        },
      },
      borderColor: theme => ({
        ...theme('colors'),
        DEFAULT: 'var(--color-border)',
        light: 'var(--color-border-light)',
        dark: 'var(--color-border-dark)',
      }),
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
        'xl': '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'slide-down': 'slideDown 200ms ease-out',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.8)' },
          '50%': { transform: 'scaleY(1.2)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          'from': { transform: 'translateY(-20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      zIndex: {
        'drawer': '1000',
        'modal': '2000',
        'toast': '3000',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/line-clamp'),
  ],
};
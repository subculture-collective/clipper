import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Mobile-first responsive breakpoints
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Primary: Twitch purple (UNCHANGED)
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#9146FF',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },

        // Secondary (UPDATED): neon-magenta vibe
        secondary: {
          50: '#fff0fb',
          100: '#ffe0f7',
          200: '#ffc2ef',
          300: '#ff94e2',
          400: '#ff5ed3',
          500: '#ff2bc2',
          600: '#e600a8',
          700: '#b80085',
          800: '#8f0067',
          900: '#6f0052',
          950: '#3f002e',
        },

        // Success state (UNCHANGED)
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // Warning state (UNCHANGED)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },

        // Error state (UNCHANGED)
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },

        // Info state (UPDATED): cyan-forward to match neon vibe
        info: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },

        // Neutral grays (UPDATED): purple-black neutrals for dark UI
        // (keeps the same `neutral-*` utilities you already use)
        neutral: {
          50: '#f7f6fb',
          100: '#edeaf6',
          200: '#d6d0ea',
          300: '#b7aed6',
          400: '#9487bd',
          500: '#786aa3',
          600: '#5f5482',
          700: '#483f62',
          800: '#332b47',
          900: '#1f172d',
          950: '#0c0714',
        },
      },

      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },

      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        'modal-backdrop': '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.2s ease-in-out',
        'fade-out': 'fade-out 0.2s ease-in-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-up': 'slide-in-up 0.3s ease-out',
        'slide-in-down': 'slide-in-down 0.3s ease-out',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },

  safelist: [
    // Primary button colors
    'bg-primary-500',
    'bg-primary-600',
    'bg-primary-700',
    'hover:bg-primary-600',
    'hover:bg-primary-700',
    'active:bg-primary-700',
    'dark:bg-primary-600',
    'dark:hover:bg-primary-700',

    // Secondary button colors
    'bg-secondary-500',
    'bg-secondary-600',
    'bg-secondary-700',
    'hover:bg-secondary-600',
    'hover:bg-secondary-700',
    'active:bg-secondary-700',

    // Error/danger colors
    'bg-error-500',
    'bg-error-600',
    'bg-error-700',
    'hover:bg-error-600',
    'hover:bg-error-700',
    'active:bg-error-700',

    // Neutral colors for ghost variant
    'hover:bg-neutral-800',
    'active:bg-neutral-700',
    'dark:hover:bg-neutral-800',
    'dark:active:bg-neutral-700',

    // Text colors
    'text-white',
    'text-primary-500',
    'text-foreground',

    // Border colors
    'border-primary-500',
    'border-2',
  ],

  plugins: [],
};

export default config;

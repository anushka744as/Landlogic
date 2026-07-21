/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1220',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
          500: '#4b5563',
          400: '#6b7280',
          300: '#9ca3af',
          200: '#d1d5db',
          100: '#e5e7eb',
          50: '#f3f4f6',
        },
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#b6d9ff',
          300: '#84c0ff',
          400: '#4f9bff',
          500: '#2b7bff',
          600: '#1a5fe6',
          700: '#1749b4',
          800: '#173f8f',
          900: '#173670',
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        success: { 500: '#10b981', 600: '#059669' },
        warning: { 500: '#f59e0b', 600: '#d97706' },
        danger:  { 500: '#ef4444', 600: '#dc2626' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 6px 24px rgba(15,23,42,0.06)',
        cardHover: '0 2px 6px rgba(15,23,42,0.08), 0 16px 40px rgba(15,23,42,0.12)',
        glow: '0 0 0 1px rgba(43,123,255,0.18), 0 10px 30px rgba(43,123,255,0.18)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.4), 0 6px 24px rgba(0,0,0,0.45)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
     keyframes: {
  'fade-in-up': {
    '0%': { opacity: '0', transform: 'translateY(8px)' },
    '100%': { opacity: '1', transform: 'none' },
  },
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'page-in': {
    '0%': { opacity: '0', transform: 'translateY(8px) scale(0.997)' },
    '100%': { opacity: '1', transform: 'none' },
  },
},
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'page-in': 'page-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#07070A',
          secondary: '#0F0F14',
          card: '#13131A',
          hover: '#1A1A24',
        },
        accent: {
          purple: '#7C3AED',
          'purple-light': '#8B5CF6',
          'purple-glow': 'rgba(124,58,237,0.15)',
          cyan: '#06B6D4',
          'cyan-light': '#22D3EE',
          'cyan-glow': 'rgba(6,182,212,0.15)',
        },
        status: {
          success: '#059669',
          'success-glow': 'rgba(5,150,105,0.15)',
          error: '#DC2626',
          'error-glow': 'rgba(220,38,38,0.15)',
          warning: '#D97706',
          'warning-glow': 'rgba(217,119,6,0.15)',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          default: 'rgba(255,255,255,0.10)',
          strong: 'rgba(255,255,255,0.18)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Status row tints — low saturation so text remains readable
        'status-inflight': '#fef3c7',   // amber-100
        'status-pending': '#eff6ff',    // blue-50
        'status-cleared': '#f0fdf4',    // green-50
        'status-void': '#f8fafc',       // slate-50
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config

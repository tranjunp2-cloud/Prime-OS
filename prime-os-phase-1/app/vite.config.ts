/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // UI framework
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Icons + UI primitives
          'vendor-ui': [
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
          // Charts
          'vendor-charts': ['recharts'],
          // Date/time
          'vendor-date': ['date-fns'],
          // Radix UI primitives (installed packages only)
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-accordion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-progress',
            '@radix-ui/react-slider',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-avatar',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-visually-hidden',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-focus-scope',
            '@radix-ui/react-focus-guards',
            '@radix-ui/react-portal',
            '@radix-ui/react-toast',
          ],
          // State + data (separate from radix to avoid circular chunk)
          'vendor-state': ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    exclude: [...configDefaults.exclude, 'tests/**'],
  },
  // Port set at runtime: bun run dev --port 5177
  // Do NOT hardcode a default port here to avoid conflicts
})

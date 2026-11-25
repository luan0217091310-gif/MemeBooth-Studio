import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { vi } from './src/i18n/vi.ts'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'localize-shell',
      transformIndexHtml(html) {
        return html
          .replaceAll('%BOOT_TEXT%', vi.boot)
          .replaceAll('%APP_NAME%', vi.brand)
      },
    },
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src/', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    cssMinify: true,
  },
  preview: { host: '127.0.0.1', port: 48217, strictPort: true },
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.{ts,tsx}'], environment: 'jsdom' },
})

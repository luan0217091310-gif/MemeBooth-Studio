import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:4173',
    channel: process.env.BROWSER_CHANNEL || 'chrome',
  },
  webServer: {
    command: 'npm run preview -- --host localhost --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
})

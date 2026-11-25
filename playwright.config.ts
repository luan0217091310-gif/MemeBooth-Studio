import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:48217',
    channel: process.env.BROWSER_CHANNEL || 'chrome',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:48217',
    reuseExistingServer: true,
  },
})

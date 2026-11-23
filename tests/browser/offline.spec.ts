import { test, expect } from '@playwright/test'
import { vi } from '../../src/i18n/vi'
test('a fresh browser can reopen the studio, debug panel and both models offline', async ({
  page,
  context,
  baseURL,
}) => {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400)
      problems.push(response.status() + ' ' + response.url())
  })
  page.on('requestfailed', (request) => problems.push(request.url()))
  context.on('request', (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).origin !== baseURL
    )
      problems.push(request.url())
  })
  await page.goto('/')
  await expect(page).toHaveTitle(vi.brand)
  await expect(page.getByRole('status')).toHaveText(vi.offline.ready, {
    timeout: 30000,
  })
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: vi.start }).click()
  await expect(
    page.getByRole('navigation', { name: vi.drawer.label }),
  ).toBeVisible()
  const debug = page.getByRole('dialog', { name: vi.backstage })
  await page.keyboard.press('d')
  await expect(debug).toContainText('MediaPipe')
  await page.keyboard.press('Escape')
  await expect(debug).toBeHidden()
  const verified = await page.evaluate(async () => {
    const { files } = (await (
      await fetch('./mediapipe/manifest.json')
    ).json()) as { files: { path: string; sha256: string }[] }
    for (const file of files) {
      const response = await fetch('./mediapipe/' + file.path)
      const digest = await crypto.subtle.digest(
        'SHA-256',
        await response.arrayBuffer(),
      )
      const hex = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('')
      if (!response.ok || hex !== file.sha256) return false
    }
    return true
  })
  expect(verified).toBe(true)
  expect(problems).toEqual([])
})

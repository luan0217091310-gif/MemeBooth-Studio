import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
})

async function openStage(page: Page) {
  await page.setViewportSize({ width: 1366, height: 800 })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('memebooth.onboarded', '1'))
  await page.reload()
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  // Chrome's fake camera sometimes ends its track; fall back to mouse mode.
  const skip = page.getByRole('button', { name: 'Dùng không cần camera' })
  if (await skip.isVisible({ timeout: 2500 }).catch(() => false))
    await skip.click()
}

test('photobooth: countdown, capture, review and PNG/JPEG download', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await openStage(page)
  // Cycle the layout chip to Polaroid (1 shot).
  const chip = page.locator('.dock-layout')
  for (
    let i = 0;
    i < 4 && !(await chip.textContent())?.includes('Polaroid');
    i++
  )
    await chip.click()
  await page.locator('.camera-stage').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Space')
  await expect(page.locator('.countdown')).toHaveText('3')
  const review = page.getByRole('dialog', { name: 'Ảnh của bạn' })
  await expect(review).toBeVisible({ timeout: 10_000 })

  const [png] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Tải PNG (in)' }).click(),
  ])
  expect(png.suggestedFilename()).toMatch(/^memebooth_\d{8}_\d{6}\.png$/)
  const bytes = await readFile((await png.path())!)
  expect(bytes.subarray(1, 4).toString()).toBe('PNG')
  expect(bytes.length).toBeGreaterThan(20_000)

  const [jpg] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Tải JPEG (nhẹ)' }).click(),
  ])
  expect(jpg.suggestedFilename()).toMatch(/\.jpg$/)
  expect(errors).toEqual([])
})

test('video: record, stop, review and download with the real extension', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await openStage(page)
  await page.locator('.camera-stage').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('r')
  await expect(page.locator('.rec-badge')).toBeVisible()
  // Fire a meme during the recording so audio + FX are in the file.
  await page.getByRole('button', { name: 'Kho Meme' }).click()
  await page.locator('.meme-tile').first().click()
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: 'Dừng' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Video của bạn' }),
  ).toBeVisible()
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Tải video' }).click(),
  ])
  expect(file.suggestedFilename()).toMatch(
    /^memebooth_\d{8}_\d{6}\.(webm|mp4)$/,
  )
  const bytes = await readFile((await file.path())!)
  expect(bytes.length).toBeGreaterThan(10_000)
  expect(errors).toEqual([])
})

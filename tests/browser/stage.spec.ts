import { expect, test } from '@playwright/test'

// Mouse-only smoke test of the live stage (no camera needed).
test('draw, onboarding, meme and vibe work with mouse only', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1366, height: 800 })
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await page.getByRole('button', { name: 'Dùng không cần camera' }).click()
  await expect(page.locator('.coach h2')).toHaveText('Thử vẽ')

  // Regression: pointer events land on the layer stack wrapper.
  const box = (await page.locator('.camera-stage').boundingBox())!
  await page.mouse.move(box.x + 550, box.y + 250)
  await page.mouse.down()
  for (let k = 0; k < 20; k++)
    await page.mouse.move(box.x + 550 + k * 12, box.y + 250 + k * 3)
  await page.mouse.up()
  await expect(page.locator('.coach h2')).toHaveText('Thử nổ meme')
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeEnabled()

  await page.getByRole('button', { name: 'Kho Meme' }).click()
  await page
    .locator('.meme-tile')
    .filter({ hasText: 'Đỉnh nóc kịch trần' })
    .click()
  await expect(page.locator('.coach h2')).toHaveText('Thử chụp')
  await page.getByRole('button', { name: 'Xong' }).click()

  await page.getByRole('button', { name: 'Vibe', exact: true }).click()
  await page.getByRole('radio', { name: /Cyber Neon/ }).click()
  await expect(page.locator('main')).toHaveAttribute('data-vibe', 'neon')
  // Drawing survives the vibe switch.
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeEnabled()
  expect(errors).toEqual([])
})

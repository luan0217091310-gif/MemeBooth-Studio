import { expect, test } from '@playwright/test'

// Mouse-only smoke test of the live stage (no camera needed).
test('meme-first onboarding, manual mouse draw and vibe work smoothly', async ({
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
  await expect(page.locator('.coach h2')).toHaveText('Thử nổ meme bằng cử chỉ')

  // Step 1: Fire a meme directly from Kho Meme.
  await page.getByRole('button', { name: 'Kho Meme' }).click()
  await page
    .locator('.meme-tile')
    .filter({ hasText: 'Đỉnh nóc kịch trần' })
    .click()
  await expect(page.locator('.coach h2')).toHaveText('Đổi Vibe & Trang trí AR')

  // Step 2: Switch to manual mouse draw mode and draw a stroke.
  await page.getByRole('radio', { name: 'Vẽ chuột' }).click()
  const box = (await page.locator('.camera-stage').boundingBox())!
  await page.mouse.move(box.x + 550, box.y + 250)
  await page.mouse.down()
  for (let k = 0; k < 20; k++)
    await page.mouse.move(box.x + 550 + k * 12, box.y + 250 + k * 3)
  await page.mouse.up()
  await expect(page.locator('.coach h2')).toHaveText(
    'Chụp ảnh & Lưu Photo Book',
  )
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeEnabled()
  await page.getByRole('button', { name: 'Xong' }).click()

  // Switch Vibe and verify drawing survives.
  await page.getByRole('button', { name: 'Vibe', exact: true }).click()
  await page.getByRole('radio', { name: /Cyber Neon/ }).click()
  await expect(page.locator('main')).toHaveAttribute('data-vibe', 'neon')
  await expect(page.getByRole('button', { name: 'Hoàn tác' })).toBeEnabled()
  expect(errors).toEqual([])
})

test('mobile viewport (390x844) has no horizontal overflow and native bottom sheet works', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('memebooth.onboarded', '1'))
  await page.reload()

  // Home screen must fit cleanly within 390px without horizontal page scroll.
  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(homeOverflow).toBe(false)

  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await page.getByRole('button', { name: 'Dùng không cần camera' }).click()

  // Bottom dock must stay completely inside the 390px viewport.
  const dockBox = (await page.locator('.dock').boundingBox())!
  expect(dockBox.x).toBeGreaterThanOrEqual(0)
  expect(dockBox.x + dockBox.width).toBeLessThanOrEqual(390.5)

  // Open Kho Meme bottom sheet, verify visible, then dismiss by tapping backdrop.
  await page.getByRole('button', { name: 'Kho Meme' }).click()
  const sheet = page.getByRole('region', { name: 'Kho Meme' })
  await expect(sheet).toBeVisible()
  await page.locator('.drawer-backdrop').click({ position: { x: 100, y: 60 } })
  await expect(sheet).toBeHidden()
  expect(errors).toEqual([])
})

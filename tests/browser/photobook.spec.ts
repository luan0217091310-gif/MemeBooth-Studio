import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  },
})
test.setTimeout(90_000)

async function openStage(page: Page) {
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  const skip = page.getByRole('button', { name: 'Dùng không cần camera' })
  if (await skip.isVisible({ timeout: 2500 }).catch(() => false))
    await skip.click()
}

test('album and custom memes survive a reload; book flips and reel exports', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1366, height: 860 })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('memebooth.onboarded', '1'))
  await page.reload()
  await openStage(page)

  // 1) Capture a Polaroid and save it to a book.
  const chip = page.locator('.dock-layout')
  for (
    let i = 0;
    i < 4 && !(await chip.textContent())?.includes('Polaroid');
    i++
  )
    await chip.click()
  await page.locator('.camera-stage').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('Space')
  const review = page.getByRole('dialog', { name: 'Ảnh của bạn' })
  await expect(review).toBeVisible({ timeout: 10_000 })
  await review.getByRole('button', { name: 'Lưu vào sổ', exact: true }).click()
  await expect(
    review.getByRole('button', { name: 'Đã lưu vào Photo Book.' }),
  ).toBeDisabled()
  await review.getByRole('button', { name: 'Đóng' }).click()

  // 2) Create a custom meme; it is usable immediately.
  await page.getByRole('button', { name: 'Tạo Meme' }).click()
  // A real PNG drawn by the browser itself.
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#ff5fa2'
    ctx.fillRect(0, 0, 64, 64)
    return c.toDataURL('image/png')
  })
  const PNG = Buffer.from(dataUrl.split(',')[1]!, 'base64')
  await page
    .locator('.creator input[type=file]')
    .first()
    .setInputFiles({ name: 'm.png', mimeType: 'image/png', buffer: PNG })
  await page.getByLabel('Tên meme').fill('Meme thử nghiệm')
  await page.getByLabel('Chữ dưới').fill('Ngon lành')
  await page.getByRole('radio', { name: /Cười \+ Like/ }).click()
  await page.getByRole('button', { name: 'Lưu meme' }).click()
  await expect(page.locator('.custom-list')).toContainText('Meme thử nghiệm')
  await page.getByRole('button', { name: 'Kho Meme' }).click()
  await page
    .locator('.meme-tile')
    .filter({ hasText: 'Meme thử nghiệm' })
    .click()

  // 3) Reload (F5): the book and the meme are still there.
  await page.waitForTimeout(800) // let the debounced settings write land
  await page.reload()
  await openStage(page)
  await page.getByRole('button', { name: 'Kho Meme' }).click()
  await expect(
    page.locator('.meme-tile').filter({ hasText: 'Meme thử nghiệm' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Photo Book' }).click()
  const shelfBook = page.locator('.shelf-book').first()
  await expect(shelfBook).toContainText('1 trang')
  await shelfBook.click()

  // 4) Flip to the first page: photo + live clip are shown.
  await page.getByRole('button', { name: 'Trang sau' }).click()
  await expect(page.locator('.book-page .page-media img').first()).toBeVisible()
  await expect(
    page.locator('.book-page video.live-clip').first(),
  ).toBeAttached()

  // 5) Highlight Reel renders and downloads.
  await page.getByRole('button', { name: 'Highlight Reel' }).click()
  await page.getByRole('button', { name: 'Tạo video' }).click()
  const download = page.getByRole('button', { name: 'Tải video' })
  await expect(download).toBeVisible({ timeout: 30_000 })
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    download.click(),
  ])
  expect(file.suggestedFilename()).toMatch(/\.(webm|mp4)$/)
  expect((await readFile((await file.path())!)).length).toBeGreaterThan(20_000)
  expect(errors).toEqual([])
})

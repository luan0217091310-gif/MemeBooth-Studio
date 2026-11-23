import { expect, test } from '@playwright/test'

test.setTimeout(90_000)

test('pose challenge: a full 5-turn round, scoreboard, strip and share QR', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 1366, height: 860 })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('memebooth.onboarded', '1'))
  await page.reload()
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await page.getByRole('button', { name: 'Dùng không cần camera' }).click()

  await page.getByRole('button', { name: 'Thử thách' }).click()
  const intro = page.getByRole('dialog', { name: 'Pose Challenge' })
  await expect(intro).toBeVisible()
  await intro.getByRole('radio', { name: 'Dễ (cử chỉ đơn)' }).click()
  await intro.getByRole('button', { name: 'Bắt đầu chơi' }).click()

  const prompt = page.locator('.challenge-card-prompt')
  for (let turn = 1; turn <= 5; turn++) {
    await expect(prompt).toContainText('Lượt ' + turn + '/5')
    if (turn === 3) {
      // Let this one time out: a miss scores 0 and resets the streak.
      await expect(prompt.locator('.ch-result.miss')).toBeVisible({
        timeout: 8000,
      })
    } else {
      await page.getByRole('button', { name: 'Làm xong rồi' }).click()
      await expect(prompt.locator('.ch-result.hit')).toBeVisible()
    }
  }

  const board = page.getByRole('dialog', { name: 'Bảng điểm' })
  await expect(board).toBeVisible({ timeout: 15_000 })
  await expect(board.locator('tbody tr')).toHaveCount(5)
  await expect(board.locator('tbody tr.miss')).toHaveCount(1)
  const total = Number(await board.locator('tfoot b').textContent())
  expect(total).toBeGreaterThan(0)
  await expect(board.locator('.score-strip')).toBeVisible()

  await board.getByRole('button', { name: 'Chia sẻ' }).click()
  const share = page.getByRole('dialog', { name: 'Chia sẻ' })
  await expect(share.getByRole('button', { name: 'Tải về' })).toBeVisible()
  await expect(
    share.locator('svg[role="img"], .qr-row svg').first(),
  ).toBeVisible()
  await expect(share).toContainText('Ảnh không rời khỏi máy bạn')
  expect(errors).toEqual([])
})

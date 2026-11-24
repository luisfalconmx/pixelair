import { expect, test } from '@playwright/test'

test.describe('Pixelair shell', () => {
  test('shows the app title and drop zone', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Pixelair')
    await expect(page.getByRole('heading', { name: 'Pixelair' })).toBeVisible()
    await expect(page.getByText(/drop images here/i)).toBeVisible()
  })
})

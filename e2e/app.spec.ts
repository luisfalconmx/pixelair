import { readFile } from 'node:fs/promises'
import type { Download } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { dropFiles, generateImage, imageSize, withExif } from './helpers'

const CODEC_TIMEOUT = 60_000

test.describe('Pixelair', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows the empty state', async ({ page }) => {
    await expect(page).toHaveTitle('Pixelair')
    await expect(page.getByRole('heading', { name: 'Pixelair' })).toBeVisible()
    await expect(page.getByText(/drop images here/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Select images' })).toBeVisible()
  })

  test('optimizes several selected images in parallel', async ({ page }) => {
    const jpeg = await generateImage(page, { name: 'photo.jpg', mimeType: 'image/jpeg' })
    const png = await generateImage(page, { name: 'graphic.png', mimeType: 'image/png' })
    const webp = await generateImage(page, { name: 'banner.webp', mimeType: 'image/webp' })

    await page.getByTestId('file-input').setInputFiles([jpeg, png, webp])

    const rows = page.getByTestId('image-row')
    await expect(rows).toHaveCount(3)
    for (const row of await rows.all()) {
      await expect(row).toHaveAttribute('data-status', 'done', { timeout: CODEC_TIMEOUT })
      await expect(row.getByTestId('optimized-size')).toBeVisible()
    }
    await expect(page.getByTestId('totals')).toContainText('3/3 optimized')
    // The selected image is shown in the comparison view
    await expect(page.getByRole('img', { name: 'photo.jpg (optimized)' })).toBeVisible()
    await expect(page.getByRole('slider', { name: 'Comparison divider' })).toBeVisible()
  })

  test('accepts images dropped on the window', async ({ page }) => {
    const png = await generateImage(page, { name: 'dropped.png', mimeType: 'image/png' })
    await dropFiles(page, [png])

    const row = page.getByTestId('image-row')
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('dropped.png')
    await expect(row).toHaveAttribute('data-status', 'done', { timeout: CODEC_TIMEOUT })
  })

  test('rejects unsupported files', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(page.getByText('Unsupported file')).toBeVisible()
    await expect(page.getByTestId('image-row')).toHaveCount(0)
  })

  test('exports an image at several densities with @Nx names', async ({ page }) => {
    const jpeg = await generateImage(page, {
      name: 'icon.jpg',
      mimeType: 'image/jpeg',
      width: 200,
      height: 100,
    })
    await page.getByTestId('file-input').setInputFiles([jpeg])
    await expect(page.getByTestId('image-row')).toHaveAttribute('data-status', 'done', {
      timeout: CODEC_TIMEOUT,
    })

    // Convert to WebP
    await page.getByTestId('format-select').click()
    await page.getByRole('option', { name: /WebP/ }).click()
    await expect(page.getByTestId('image-row')).toHaveAttribute('data-status', 'done', {
      timeout: CODEC_TIMEOUT,
    })
    await expect(page.getByTestId('compare-result')).toContainText('WebP')

    // 1x is selected by default; add 0.5x, 2x and 3x
    const sizes = page.getByRole('toolbar', { name: 'Export sizes' })
    for (const scale of ['0.5x', '2x', '3x']) {
      await sizes.getByRole('button', { name: scale, exact: true }).click()
    }
    const outputs = page.getByRole('list', { name: 'Output files' })
    await expect(outputs.getByRole('listitem')).toHaveText([
      'icon@0.5x.webp',
      'icon.webp',
      'icon@2x.webp',
      'icon@3x.webp',
    ])

    const downloads: Download[] = []
    page.on('download', (download) => downloads.push(download))
    await page.getByRole('button', { name: 'Export this image' }).click()
    await expect(page.getByText('Saved 4 files')).toBeVisible({ timeout: CODEC_TIMEOUT })
    await expect
      .poll(() => downloads.map((d) => d.suggestedFilename()).sort())
      .toEqual(['icon.webp', 'icon@0.5x.webp', 'icon@2x.webp', 'icon@3x.webp'].sort())

    const expected: Record<string, { width: number; height: number }> = {
      'icon@0.5x.webp': { width: 100, height: 50 },
      'icon.webp': { width: 200, height: 100 },
      'icon@2x.webp': { width: 400, height: 200 },
      'icon@3x.webp': { width: 600, height: 300 },
    }
    for (const download of downloads) {
      const bytes = await readFile((await download.path()) as string)
      expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP')
      expect(await imageSize(page, bytes, 'image/webp')).toEqual(
        expected[download.suggestedFilename()],
      )
    }
  })

  test('strips metadata and keeps the EXIF orientation', async ({ page }) => {
    const base = await generateImage(page, {
      name: 'camera.jpg',
      mimeType: 'image/jpeg',
      width: 200,
      height: 100,
    })
    // Orientation 6 = rotate 90° clockwise: the photo should end up portrait
    const photo = withExif(base, 6)
    expect(photo.buffer.includes('PixelairTestCam')).toBe(true)

    await page.getByTestId('file-input').setInputFiles([photo])
    await expect(page.getByTestId('image-row')).toHaveAttribute('data-status', 'done', {
      timeout: CODEC_TIMEOUT,
    })

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export this image' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('camera.jpg')
    const bytes = await readFile((await download.path()) as string)

    expect(bytes.includes('Exif')).toBe(false)
    expect(bytes.includes('PixelairTestCam')).toBe(false)
    expect(await imageSize(page, bytes, 'image/jpeg')).toEqual({ width: 100, height: 200 })
  })

  test('encodes AVIF with libavif', async ({ page }) => {
    const png = await generateImage(page, {
      name: 'hero.png',
      mimeType: 'image/png',
      width: 160,
      height: 120,
    })
    await page.getByTestId('file-input').setInputFiles([png])
    await page.getByTestId('format-select').click()
    await page.getByRole('option', { name: /AVIF/ }).click()
    await expect(page.getByTestId('compare-result')).toContainText('AVIF')
    await expect(page.getByTestId('image-row')).toHaveAttribute('data-status', 'done', {
      timeout: CODEC_TIMEOUT,
    })

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export this image' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('hero.avif')
    const bytes = await readFile((await download.path()) as string)
    expect(bytes.subarray(4, 12).toString('latin1')).toBe('ftypavif')
  })
})

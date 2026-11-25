import type { Page } from '@playwright/test'

export interface GeneratedImage {
  name: string
  mimeType: string
  buffer: Buffer
}

/** Renders a photo-like test image in the browser and returns its encoded bytes. */
export async function generateImage(
  page: Page,
  {
    name,
    mimeType,
    width = 480,
    height = 320,
  }: { name: string; mimeType: string; width?: number; height?: number },
): Promise<GeneratedImage> {
  const base64 = await page.evaluate(
    async ({ mimeType, width, height }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#7c3aed')
      gradient.addColorStop(1, '#06b6d4')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      // Deterministic noise so encoders have real work to do
      let seed = 42
      for (let i = 0; i < 4000; i++) {
        seed = (seed * 16807) % 2147483647
        const x = seed % width
        seed = (seed * 16807) % 2147483647
        const y = seed % height
        ctx.fillStyle = `hsl(${seed % 360} 70% 60% / .6)`
        ctx.fillRect(x, y, 6, 6)
      }
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b as Blob), mimeType, 1),
      )
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return btoa(binary)
    },
    { mimeType, width, height },
  )
  return { name, mimeType, buffer: Buffer.from(base64, 'base64') }
}

/** Simulates dropping files on the window, like dragging them from the file manager. */
export async function dropFiles(page: Page, files: GeneratedImage[]) {
  await page.evaluate(
    (files) => {
      const transfer = new DataTransfer()
      for (const f of files) {
        const bytes = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0))
        transfer.items.add(new File([bytes], f.name, { type: f.mimeType }))
      }
      for (const type of ['dragenter', 'dragover', 'drop']) {
        window.dispatchEvent(
          new DragEvent(type, { dataTransfer: transfer, bubbles: true, cancelable: true }),
        )
      }
    },
    files.map((f) => ({ name: f.name, mimeType: f.mimeType, base64: f.buffer.toString('base64') })),
  )
}

/**
 * Inserts an EXIF APP1 segment right after the JPEG SOI marker with the given
 * orientation, a camera "Make" tag and fake GPS-ish text so we can assert it's stripped.
 */
export function withExif(jpeg: GeneratedImage, orientation: number): GeneratedImage {
  const make = Buffer.from('PixelairTestCam\0', 'latin1')
  const tiff = Buffer.alloc(8 + 2 + 12 * 2 + 4)
  tiff.write('II', 0, 'latin1')
  tiff.writeUInt16LE(42, 2)
  tiff.writeUInt32LE(8, 4)
  tiff.writeUInt16LE(2, 8) // two IFD entries
  // Make (ASCII), stored after the IFD
  tiff.writeUInt16LE(0x010f, 10)
  tiff.writeUInt16LE(2, 12)
  tiff.writeUInt32LE(make.length, 14)
  tiff.writeUInt32LE(tiff.length, 18)
  // Orientation (SHORT)
  tiff.writeUInt16LE(0x0112, 22)
  tiff.writeUInt16LE(3, 24)
  tiff.writeUInt32LE(1, 26)
  tiff.writeUInt16LE(orientation, 30)
  tiff.writeUInt32LE(0, 34) // no next IFD
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, make])
  const header = Buffer.alloc(4)
  header.writeUInt16BE(0xffe1, 0)
  header.writeUInt16BE(payload.length + 2, 2)
  const buffer = Buffer.concat([
    jpeg.buffer.subarray(0, 2),
    header,
    payload,
    jpeg.buffer.subarray(2),
  ])
  return { ...jpeg, buffer }
}

/** Decodes image bytes in the page and returns their dimensions. */
export async function imageSize(page: Page, bytes: Buffer, mimeType: string) {
  return page.evaluate(
    async ({ base64, mimeType }) => {
      const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const bitmap = await createImageBitmap(new Blob([data], { type: mimeType }), {
        imageOrientation: 'from-image',
      })
      return { width: bitmap.width, height: bitmap.height }
    },
    { base64: bytes.toString('base64'), mimeType },
  )
}

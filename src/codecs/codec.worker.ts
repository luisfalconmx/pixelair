/// <reference lib="webworker" />
/**
 * Image codec worker. Uses the same WebAssembly codecs as Squoosh (via jSquash):
 * MozJPEG, OxiPNG, libwebp, libavif and Squoosh's resize (Lanczos3).
 *
 * Decoding to raw pixels and re-encoding drops every metadata block (EXIF, XMP, ICC, GPS…).
 * JPEG EXIF orientation is applied to the pixels first so photos keep their rotation.
 */
import type { SourceFormat } from '@/lib/formats'
import { exceedsPixelLimit, scaledDimensions } from '@/lib/size'
import type {
  EncodeSettings,
  ProcessedOutput,
  ProcessFailure,
  ProcessRequest,
  WorkerResponse,
} from './types'

declare const self: DedicatedWorkerGlobalScope

async function decode(buffer: ArrayBuffer, format: SourceFormat): Promise<ImageData> {
  switch (format) {
    case 'jpeg': {
      const { default: decodeJpeg } = await import('@jsquash/jpeg/decode')
      return decodeJpeg(buffer, { preserveOrientation: true })
    }
    case 'png': {
      const { default: decodePng } = await import('@jsquash/png/decode')
      return decodePng(buffer)
    }
    case 'webp': {
      const { default: decodeWebp } = await import('@jsquash/webp/decode')
      return decodeWebp(buffer)
    }
    case 'avif': {
      const { default: decodeAvif } = await import('@jsquash/avif/decode')
      const data = await decodeAvif(buffer)
      if (!data) throw new Error('Could not decode AVIF image')
      return data
    }
    default:
      return decodeWithBrowser(buffer)
  }
}

/** GIF (first frame) and BMP are decoded by the webview itself. */
async function decodeWithBrowser(buffer: ArrayBuffer): Promise<ImageData> {
  const bitmap = await createImageBitmap(new Blob([buffer]))
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is not available')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

async function resizeTo(image: ImageData, width: number, height: number): Promise<ImageData> {
  if (image.width === width && image.height === height) return image
  const { default: resize } = await import('@jsquash/resize')
  // Squoosh defaults: Lanczos3 in linear RGB with premultiplied alpha
  return resize(image, { width, height, method: 'lanczos3', premultiply: true, linearRGB: true })
}

function hasTransparency(image: ImageData): boolean {
  const { data } = image
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true
  }
  return false
}

/** JPEG has no alpha channel: composite over white instead of letting transparent pixels go black. */
function flattenOnWhite(image: ImageData): ImageData {
  if (!hasTransparency(image)) return image
  const out = new Uint8ClampedArray(image.data.length)
  const src = image.data
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3] / 255
    out[i] = src[i] * a + 255 * (1 - a)
    out[i + 1] = src[i + 1] * a + 255 * (1 - a)
    out[i + 2] = src[i + 2] * a + 255 * (1 - a)
    out[i + 3] = 255
  }
  return new ImageData(out, image.width, image.height)
}

async function encode(image: ImageData, settings: EncodeSettings): Promise<ArrayBuffer> {
  switch (settings.format) {
    case 'jpeg': {
      const { default: encodeJpeg } = await import('@jsquash/jpeg/encode')
      return encodeJpeg(flattenOnWhite(image), { quality: settings.quality })
    }
    case 'png': {
      const { default: optimise } = await import('@jsquash/oxipng/optimise')
      return optimise(image, { level: settings.pngLevel, interlace: false, optimiseAlpha: true })
    }
    case 'webp': {
      const { default: encodeWebp } = await import('@jsquash/webp/encode')
      return encodeWebp(image, {
        quality: settings.quality,
        lossless: settings.lossless ? 1 : 0,
        exact: settings.lossless ? 1 : 0,
      })
    }
    case 'avif': {
      const { default: encodeAvif } = await import('@jsquash/avif/encode')
      return encodeAvif(image, { quality: settings.quality, lossless: settings.lossless })
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function process(request: ProcessRequest): Promise<WorkerResponse> {
  const source = await decode(request.source, request.sourceFormat)
  const outputs: ProcessedOutput[] = []
  const failures: ProcessFailure[] = []

  for (const scale of request.scales) {
    try {
      const { width, height } = scaledDimensions(source.width, source.height, scale)
      if (exceedsPixelLimit(width, height)) {
        throw new Error(`Output ${width}×${height} is too large`)
      }
      const resized = await resizeTo(source, width, height)
      const data = await encode(resized, request.settings)
      outputs.push({ scale, width, height, data })
    } catch (error) {
      failures.push({ scale, error: errorMessage(error) })
    }
  }

  return {
    type: 'result',
    result: {
      id: request.id,
      sourceWidth: source.width,
      sourceHeight: source.height,
      outputs,
      failures,
    },
  }
}

self.addEventListener('message', async (event: MessageEvent<ProcessRequest>) => {
  const request = event.data
  let response: WorkerResponse
  try {
    response = await process(request)
  } catch (error) {
    response = { type: 'error', id: request.id, error: errorMessage(error) }
  }
  const transfer = response.type === 'result' ? response.result.outputs.map((o) => o.data) : []
  self.postMessage(response, transfer)
})

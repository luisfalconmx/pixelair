/** Formats Pixelair can read. */
export type SourceFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'bmp'

/** Formats Pixelair can write (same codecs as Squoosh). */
export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'

export interface OutputFormatInfo {
  id: OutputFormat
  label: string
  codec: string
  mime: string
  extension: string
  lossy: boolean
  supportsLossless: boolean
  defaultQuality: number
}

export const OUTPUT_FORMATS: Record<OutputFormat, OutputFormatInfo> = {
  jpeg: {
    id: 'jpeg',
    label: 'JPEG',
    codec: 'MozJPEG',
    mime: 'image/jpeg',
    extension: 'jpg',
    lossy: true,
    supportsLossless: false,
    defaultQuality: 75,
  },
  png: {
    id: 'png',
    label: 'PNG',
    codec: 'OxiPNG',
    mime: 'image/png',
    extension: 'png',
    lossy: false,
    supportsLossless: false,
    defaultQuality: 100,
  },
  webp: {
    id: 'webp',
    label: 'WebP',
    codec: 'libwebp',
    mime: 'image/webp',
    extension: 'webp',
    lossy: true,
    supportsLossless: true,
    defaultQuality: 75,
  },
  avif: {
    id: 'avif',
    label: 'AVIF',
    codec: 'libavif',
    mime: 'image/avif',
    extension: 'avif',
    lossy: true,
    supportsLossless: true,
    defaultQuality: 50,
  },
}

export const OUTPUT_FORMAT_LIST = Object.values(OUTPUT_FORMATS)

const MIME_TO_SOURCE: Record<string, SourceFormat> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/pjpeg': 'jpeg',
  'image/png': 'png',
  'image/apng': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/x-ms-bmp': 'bmp',
}

const EXTENSION_TO_SOURCE: Record<string, SourceFormat> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jfif: 'jpeg',
  pjpeg: 'jpeg',
  png: 'png',
  apng: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  bmp: 'bmp',
}

export const ACCEPTED_EXTENSIONS = Object.keys(EXTENSION_TO_SOURCE).map((ext) => `.${ext}`)
export const ACCEPT_ATTRIBUTE = [...Object.keys(MIME_TO_SOURCE), ...ACCEPTED_EXTENSIONS].join(',')

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

/** Detects the source format from the MIME type, falling back to the file extension. */
export function detectSourceFormat(file: Pick<File, 'name' | 'type'>): SourceFormat | null {
  return (
    MIME_TO_SOURCE[file.type.toLowerCase()] ?? EXTENSION_TO_SOURCE[extensionOf(file.name)] ?? null
  )
}

/** Format used by default for a source: keep it when we can encode it, otherwise PNG (lossless). */
export function defaultOutputFormat(source: SourceFormat): OutputFormat {
  return source in OUTPUT_FORMATS ? (source as OutputFormat) : 'png'
}

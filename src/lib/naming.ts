import { extensionOf } from './formats'

export const SCALES = [0.5, 0.75, 1, 1.5, 2, 3, 4] as const
export type Scale = (typeof SCALES)[number]

export function isScale(value: number): value is Scale {
  return (SCALES as readonly number[]).includes(value)
}

export function scaleLabel(scale: number): string {
  return `${scale}x`
}

/** Removes the extension from a file name (`photo.final.JPG` → `photo.final`). */
export function baseName(fileName: string): string {
  const ext = extensionOf(fileName)
  return ext ? fileName.slice(0, -(ext.length + 1)) : fileName
}

/**
 * Output file name for a given scale.
 * 1x keeps the plain name (`image.webp`), other densities get a suffix (`image@2x.webp`,
 * `image@0.5x.webp`), following the iOS / Flutter asset convention.
 */
export function outputFileName(sourceName: string, extension: string, scale: number): string {
  const base = baseName(sourceName) || 'image'
  const suffix = scale === 1 ? '' : `@${scale}x`
  return `${base}${suffix}.${extension}`
}

/** Sorts and de-duplicates scales, keeping only supported values. */
export function normalizeScales(scales: Iterable<number>): Scale[] {
  return SCALES.filter((s) => new Set(scales).has(s))
}

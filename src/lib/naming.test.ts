import { baseName, normalizeScales, outputFileName, SCALES } from './naming'

describe('outputFileName', () => {
  it.each([
    [0.5, 'image@0.5x.webp'],
    [0.75, 'image@0.75x.webp'],
    [1, 'image.webp'],
    [1.5, 'image@1.5x.webp'],
    [2, 'image@2x.webp'],
    [3, 'image@3x.webp'],
    [4, 'image@4x.webp'],
  ])('names the %sx variant %s', (scale, expected) => {
    expect(outputFileName('image.png', 'webp', scale)).toBe(expected)
  })

  it('keeps dots inside the name and replaces only the extension', () => {
    expect(outputFileName('my.photo.final.JPEG', 'jpg', 2)).toBe('my.photo.final@2x.jpg')
  })

  it('handles names without extension', () => {
    expect(outputFileName('scan', 'png', 3)).toBe('scan@3x.png')
  })
})

describe('baseName', () => {
  it('strips only the last extension', () => {
    expect(baseName('a.b.c.png')).toBe('a.b.c')
    expect(baseName('.hidden')).toBe('.hidden')
  })
})

describe('normalizeScales', () => {
  it('sorts, de-duplicates and drops unsupported values', () => {
    expect(normalizeScales([4, 1, 2, 2, 5, 0.5])).toEqual([0.5, 1, 2, 4])
  })

  it('supports every requested density', () => {
    expect(SCALES).toEqual([0.5, 0.75, 1, 1.5, 2, 3, 4])
  })
})

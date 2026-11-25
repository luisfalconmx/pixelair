import { defaultOutputFormat, detectSourceFormat, OUTPUT_FORMATS } from './formats'

describe('detectSourceFormat', () => {
  it.each([
    [{ name: 'a.jpg', type: 'image/jpeg' }, 'jpeg'],
    [{ name: 'a.JPEG', type: '' }, 'jpeg'],
    [{ name: 'a.png', type: 'image/png' }, 'png'],
    [{ name: 'a.webp', type: '' }, 'webp'],
    [{ name: 'a.avif', type: 'image/avif' }, 'avif'],
    [{ name: 'a.gif', type: 'image/gif' }, 'gif'],
    [{ name: 'a.bmp', type: '' }, 'bmp'],
  ] as const)('detects %o as %s', (file, expected) => {
    expect(detectSourceFormat(file)).toBe(expected)
  })

  it('rejects other files', () => {
    expect(detectSourceFormat({ name: 'notes.txt', type: 'text/plain' })).toBeNull()
    expect(detectSourceFormat({ name: 'vector.svg', type: 'image/svg+xml' })).toBeNull()
  })
})

describe('defaultOutputFormat', () => {
  it('keeps encodable formats and falls back to PNG', () => {
    expect(defaultOutputFormat('jpeg')).toBe('jpeg')
    expect(defaultOutputFormat('avif')).toBe('avif')
    expect(defaultOutputFormat('gif')).toBe('png')
    expect(defaultOutputFormat('bmp')).toBe('png')
  })

  it('uses Squoosh default qualities', () => {
    expect(OUTPUT_FORMATS.jpeg.defaultQuality).toBe(75)
    expect(OUTPUT_FORMATS.webp.defaultQuality).toBe(75)
    expect(OUTPUT_FORMATS.avif.defaultQuality).toBe(50)
  })
})

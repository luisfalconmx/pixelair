import { exceedsPixelLimit, formatBytes, savingsPercent, scaledDimensions } from './size'

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1.50 KB'],
    [10 * 1024 * 1024, '10.0 MB'],
    [250 * 1024, '250 KB'],
  ])('formats %i as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})

describe('savingsPercent', () => {
  it('returns positive savings and negative growth', () => {
    expect(savingsPercent(1000, 250)).toBe(75)
    expect(savingsPercent(1000, 1200)).toBe(-20)
    expect(savingsPercent(0, 10)).toBe(0)
  })
})

describe('scaledDimensions', () => {
  it('rounds and never returns zero', () => {
    expect(scaledDimensions(301, 201, 0.5)).toEqual({ width: 151, height: 101 })
    expect(scaledDimensions(1, 1, 0.5)).toEqual({ width: 1, height: 1 })
    expect(scaledDimensions(200, 100, 4)).toEqual({ width: 800, height: 400 })
  })

  it('guards huge outputs', () => {
    expect(exceedsPixelLimit(8000, 8000)).toBe(false)
    expect(exceedsPixelLimit(16000, 16000)).toBe(true)
  })
})

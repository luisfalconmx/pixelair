import type { ProcessResult } from '@/codecs/types'
import type { ExportFile } from '@/platform/export'
import { type CodecRunner, PREVIEW_DEBOUNCE_MS, setCodecRunner, useImages } from './images'

const saved: ExportFile[] = []
vi.mock('@/platform/export', () => ({
  chooseExportTarget: vi.fn(async () => ({ directory: '/out' })),
  saveFile: vi.fn(async (_target: unknown, file: ExportFile) => {
    saved.push(file)
    return `/out/${file.name}`
  }),
}))

/** Fake codec: output size = 100 bytes per scale unit, dimensions 200×100 × scale. */
const fakeRunner = vi.fn<CodecRunner>(async (request) => {
  const result: ProcessResult = {
    id: 1,
    sourceWidth: 200,
    sourceHeight: 100,
    outputs: request.scales.map((scale) => ({
      scale,
      width: 200 * scale,
      height: 100 * scale,
      data: new ArrayBuffer(Math.round(100 * scale)),
    })),
    failures: [],
  }
  return result
})

function file(name: string, type: string, size = 1000) {
  return new File([new Uint8Array(size)], name, { type })
}

const state = () => useImages.getState()

async function settle() {
  await vi.runAllTimersAsync()
}

beforeEach(() => {
  vi.useFakeTimers()
  setCodecRunner(fakeRunner)
  fakeRunner.mockClear()
  saved.length = 0
  state().clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('images store', () => {
  it('adds supported files, rejects the rest and starts compressing right away', async () => {
    const { added, rejected } = state().addFiles([
      file('a.jpg', 'image/jpeg'),
      file('b.png', 'image/png'),
      file('notes.txt', 'text/plain'),
    ])
    expect(added).toBe(2)
    expect(rejected).toEqual(['notes.txt'])
    expect(state().items.map((i) => i.status)).toEqual(['processing', 'processing'])
    expect(state().selectedId).toBe(state().items[0].id)

    await settle()
    expect(fakeRunner).toHaveBeenCalledTimes(2)
    const [jpeg, png] = state().items
    expect(jpeg.status).toBe('done')
    expect(jpeg.result?.size).toBe(100)
    expect(jpeg.width).toBe(200)
    expect(jpeg.settings.format).toBe('jpeg')
    expect(png.settings.format).toBe('png')
  })

  it('re-encodes (debounced) when encoder settings change and resets quality per format', async () => {
    state().addFiles([file('a.jpg', 'image/jpeg')])
    await settle()
    const id = state().items[0].id

    state().updateSettings(id, { format: 'avif' })
    state().updateSettings(id, { quality: 40 })
    expect(state().items[0].status).toBe('processing')
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS - 1)
    expect(fakeRunner).toHaveBeenCalledTimes(1)
    await settle()
    expect(fakeRunner).toHaveBeenCalledTimes(2)
    expect(fakeRunner.mock.calls[1][0].settings).toMatchObject({ format: 'avif', quality: 40 })

    state().updateSettings(id, { format: 'webp' })
    expect(state().items[0].settings.quality).toBe(75)
  })

  it('does not re-encode when only export sizes change', async () => {
    state().addFiles([file('a.jpg', 'image/jpeg')])
    await settle()
    const id = state().items[0].id
    state().updateSettings(id, { scales: [4, 1, 2] })
    await settle()
    expect(fakeRunner).toHaveBeenCalledTimes(1)
    expect(state().items[0].settings.scales).toEqual([1, 2, 4])
    expect(state().items[0].status).toBe('done')
  })

  it('applies one image settings to every image', async () => {
    state().addFiles([file('a.jpg', 'image/jpeg'), file('b.png', 'image/png')])
    await settle()
    const [a] = state().items
    state().updateSettings(a.id, { format: 'webp', quality: 60, scales: [1, 2] })
    state().applySettingsToAll(a.id)
    await settle()
    expect(state().items[1].settings).toMatchObject({ format: 'webp', quality: 60, scales: [1, 2] })
  })

  it('exports every selected density with @Nx names, reusing the 1x preview', async () => {
    state().addFiles([file('photo.jpg', 'image/jpeg'), file('logo.png', 'image/png')])
    await settle()
    const [photo] = state().items
    state().updateSettings(photo.id, { format: 'webp', scales: [0.5, 1, 2, 3] })
    await settle()
    fakeRunner.mockClear()

    const summary = await state().exportImages()

    expect(summary?.failed).toEqual([])
    expect(saved.map((f) => f.name).sort()).toEqual(
      ['logo.png', 'photo.webp', 'photo@0.5x.webp', 'photo@2x.webp', 'photo@3x.webp'].sort(),
    )
    // logo.png only needs 1x (already encoded); photo needs 0.5x, 2x and 3x
    expect(fakeRunner).toHaveBeenCalledTimes(1)
    expect(fakeRunner.mock.calls[0][0].scales).toEqual([0.5, 2, 3])
    expect(state().exporting).toBeNull()
  })

  it('reports per-scale encoder failures', async () => {
    state().addFiles([file('huge.png', 'image/png')])
    await settle()
    const id = state().items[0].id
    state().updateSettings(id, { scales: [1, 4] })
    fakeRunner.mockResolvedValueOnce({
      id: 1,
      sourceWidth: 1,
      sourceHeight: 1,
      outputs: [],
      failures: [{ scale: 4, error: 'Output is too large' }],
    })
    const summary = await state().exportImages([id])
    expect(summary?.saved).toEqual(['/out/huge.png'])
    expect(summary?.failed).toEqual([{ name: 'huge@4x.png', error: 'Output is too large' }])
  })

  it('marks images that fail to decode', async () => {
    fakeRunner.mockRejectedValueOnce(new Error('Corrupt JPEG'))
    state().addFiles([file('broken.jpg', 'image/jpeg')])
    await settle()
    expect(state().items[0]).toMatchObject({ status: 'error', error: 'Corrupt JPEG' })
  })

  it('removes images and moves the selection', async () => {
    state().addFiles([file('a.jpg', 'image/jpeg'), file('b.jpg', 'image/jpeg')])
    await settle()
    const [a, b] = state().items
    state().remove(a.id)
    expect(state().items).toHaveLength(1)
    expect(state().selectedId).toBe(b.id)
  })
})

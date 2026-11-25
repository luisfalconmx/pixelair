import { create } from 'zustand'
import { AbortError, getCodecPool } from '@/codecs/pool'
import type { EncodeSettings, ProcessRequest, ProcessResult } from '@/codecs/types'
import {
  defaultOutputFormat,
  detectSourceFormat,
  OUTPUT_FORMATS,
  type OutputFormat,
  type SourceFormat,
} from '@/lib/formats'
import { normalizeScales, outputFileName, type Scale } from '@/lib/naming'
import { chooseExportTarget, type ExportFile, saveFile } from '@/platform/export'

export interface ImageSettings extends EncodeSettings {
  scales: Scale[]
}

export type ImageStatus = 'processing' | 'done' | 'error'

export interface OptimizedImage {
  blob: Blob
  url: string
  size: number
  width: number
  height: number
}

export interface ImageItem {
  id: string
  file: File
  name: string
  sourceFormat: SourceFormat
  originalSize: number
  originalUrl: string
  width: number | null
  height: number | null
  settings: ImageSettings
  status: ImageStatus
  result: OptimizedImage | null
  error: string | null
  /** Bumped on every settings change; stale encoder results are discarded. */
  revision: number
}

export interface ExportProgress {
  done: number
  total: number
}

export interface ExportSummary {
  saved: string[]
  failed: { name: string; error: string }[]
  directory: string | null
}

export type CodecRunner = (
  request: Omit<ProcessRequest, 'id'>,
  signal?: AbortSignal,
) => Promise<ProcessResult>

interface ImagesState {
  items: ImageItem[]
  selectedId: string | null
  exporting: ExportProgress | null
  /** Returns the number of files rejected because their format isn't supported. */
  addFiles: (files: Iterable<File>) => { added: number; rejected: string[] }
  remove: (id: string) => void
  clear: () => void
  select: (id: string | null) => void
  updateSettings: (id: string, patch: Partial<ImageSettings>) => void
  applySettingsToAll: (id: string) => void
  exportImages: (ids?: string[]) => Promise<ExportSummary | null>
}

export const PREVIEW_DEBOUNCE_MS = 250

let runCodec: CodecRunner = (request, signal) => getCodecPool().run(request, signal)

/** Swap the codec implementation (tests). */
export function setCodecRunner(runner: CodecRunner): void {
  runCodec = runner
}

export function defaultSettings(format: OutputFormat): ImageSettings {
  return {
    format,
    quality: OUTPUT_FORMATS[format].defaultQuality,
    lossless: false,
    pngLevel: 2,
    scales: [1],
  }
}

export function encodeSettingsOf(settings: ImageSettings): EncodeSettings {
  const { format, quality, lossless, pngLevel } = settings
  return { format, quality, lossless, pngLevel }
}

let idCounter = 0
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const controllers = new Map<string, AbortController>()

function cancelPreview(id: string) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  controllers.get(id)?.abort()
  controllers.delete(id)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const useImages = create<ImagesState>()((set, get) => {
  const patchItem = (
    id: string,
    patch: Partial<ImageItem> | ((item: ImageItem) => Partial<ImageItem>),
  ) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...(typeof patch === 'function' ? patch(item) : patch) } : item,
      ),
    }))

  const findItem = (id: string) => get().items.find((item) => item.id === id)

  /** Encodes the 1x preview with the current settings. */
  const processPreview = async (id: string) => {
    const item = findItem(id)
    if (!item) return
    const { revision } = item
    const controller = new AbortController()
    controllers.set(id, controller)

    try {
      const result = await runCodec(
        {
          source: await item.file.arrayBuffer(),
          sourceFormat: item.sourceFormat,
          settings: encodeSettingsOf(item.settings),
          scales: [1],
        },
        controller.signal,
      )
      const current = findItem(id)
      if (!current || current.revision !== revision || controller.signal.aborted) return
      const [output] = result.outputs
      if (!output) throw new Error(result.failures[0]?.error ?? 'Encoding failed')

      const blob = new Blob([output.data], { type: OUTPUT_FORMATS[current.settings.format].mime })
      if (current.result) URL.revokeObjectURL(current.result.url)
      patchItem(id, {
        status: 'done',
        error: null,
        width: result.sourceWidth,
        height: result.sourceHeight,
        result: {
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
          width: output.width,
          height: output.height,
        },
      })
    } catch (error) {
      if (error instanceof AbortError) return
      const current = findItem(id)
      if (!current || current.revision !== revision) return
      patchItem(id, { status: 'error', error: errorMessage(error) })
    } finally {
      if (controllers.get(id) === controller) controllers.delete(id)
    }
  }

  const schedulePreview = (id: string, delay = PREVIEW_DEBOUNCE_MS) => {
    cancelPreview(id)
    if (delay === 0) {
      void processPreview(id)
      return
    }
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        void processPreview(id)
      }, delay),
    )
  }

  const releaseItem = (item: ImageItem) => {
    cancelPreview(item.id)
    URL.revokeObjectURL(item.originalUrl)
    if (item.result) URL.revokeObjectURL(item.result.url)
  }

  return {
    items: [],
    selectedId: null,
    exporting: null,

    addFiles: (files) => {
      const added: ImageItem[] = []
      const rejected: string[] = []
      for (const file of files) {
        const sourceFormat = detectSourceFormat(file)
        if (!sourceFormat) {
          rejected.push(file.name)
          continue
        }
        added.push({
          id: `img-${Date.now().toString(36)}-${(idCounter++).toString(36)}`,
          file,
          name: file.name,
          sourceFormat,
          originalSize: file.size,
          originalUrl: URL.createObjectURL(file),
          width: null,
          height: null,
          settings: defaultSettings(defaultOutputFormat(sourceFormat)),
          status: 'processing',
          result: null,
          error: null,
          revision: 0,
        })
      }
      if (added.length > 0) {
        set((state) => ({
          items: [...state.items, ...added],
          selectedId: state.selectedId ?? added[0].id,
        }))
        // Compression starts right away, like Squoosh
        for (const item of added) schedulePreview(item.id, 0)
      }
      return { added: added.length, rejected }
    },

    remove: (id) => {
      const item = findItem(id)
      if (item) releaseItem(item)
      set((state) => {
        const index = state.items.findIndex((i) => i.id === id)
        const items = state.items.filter((i) => i.id !== id)
        const selectedId =
          state.selectedId === id
            ? (items[Math.min(index, items.length - 1)]?.id ?? null)
            : state.selectedId
        return { items, selectedId }
      })
    },

    clear: () => {
      for (const item of get().items) releaseItem(item)
      set({ items: [], selectedId: null })
    },

    select: (id) => set({ selectedId: id }),

    updateSettings: (id, patch) => {
      const item = findItem(id)
      if (!item) return
      const next: ImageSettings = { ...item.settings, ...patch }
      if (patch.format && patch.format !== item.settings.format && patch.quality === undefined) {
        next.quality = OUTPUT_FORMATS[patch.format].defaultQuality
      }
      if (patch.scales) next.scales = normalizeScales(patch.scales)
      const needsEncode =
        next.format !== item.settings.format ||
        next.quality !== item.settings.quality ||
        next.lossless !== item.settings.lossless ||
        next.pngLevel !== item.settings.pngLevel
      patchItem(id, (current) => ({
        settings: next,
        ...(needsEncode ? { status: 'processing' as const, revision: current.revision + 1 } : {}),
      }))
      if (needsEncode) schedulePreview(id)
    },

    applySettingsToAll: (id) => {
      const source = findItem(id)
      if (!source) return
      for (const item of get().items) {
        if (item.id !== id) get().updateSettings(item.id, { ...source.settings })
      }
    },

    exportImages: async (ids) => {
      const items = get().items.filter((item) => !ids || ids.includes(item.id))
      if (items.length === 0 || get().exporting) return null
      const target = await chooseExportTarget()
      if (!target) return null

      const total = items.reduce((sum, item) => sum + item.settings.scales.length, 0)
      const summary: ExportSummary = { saved: [], failed: [], directory: target.directory }
      set({ exporting: { done: 0, total } })
      const tick = () =>
        set((state) => ({
          exporting: state.exporting && { ...state.exporting, done: state.exporting.done + 1 },
        }))

      const exportItem = async (item: ImageItem) => {
        const { settings } = item
        const format = OUTPUT_FORMATS[settings.format]
        const files: (ExportFile & { scale: number })[] = []
        // The 1x preview is already encoded with the same settings: reuse it
        const reusePreview = item.status === 'done' && item.result && settings.scales.includes(1)
        if (reusePreview && item.result) {
          files.push({
            scale: 1,
            name: outputFileName(item.name, format.extension, 1),
            data: item.result.blob,
          })
        }
        const pending = settings.scales.filter((s) => !(reusePreview && s === 1))
        if (pending.length > 0) {
          try {
            const result = await runCodec({
              source: await item.file.arrayBuffer(),
              sourceFormat: item.sourceFormat,
              settings: encodeSettingsOf(settings),
              scales: pending,
            })
            for (const output of result.outputs) {
              files.push({
                scale: output.scale,
                name: outputFileName(item.name, format.extension, output.scale),
                data: new Blob([output.data], { type: format.mime }),
              })
            }
            for (const failure of result.failures) {
              summary.failed.push({
                name: outputFileName(item.name, format.extension, failure.scale),
                error: failure.error,
              })
              tick()
            }
          } catch (error) {
            for (const scale of pending) {
              summary.failed.push({
                name: outputFileName(item.name, format.extension, scale),
                error: errorMessage(error),
              })
              tick()
            }
          }
        }
        files.sort((a, b) => a.scale - b.scale)
        for (const file of files) {
          try {
            summary.saved.push(await saveFile(target, file))
          } catch (error) {
            summary.failed.push({ name: file.name, error: errorMessage(error) })
          }
          tick()
        }
      }

      try {
        await Promise.all(items.map(exportItem))
      } finally {
        set({ exporting: null })
      }
      return summary
    },
  }
})

export function selectSelectedItem(state: ImagesState): ImageItem | null {
  return state.items.find((item) => item.id === state.selectedId) ?? null
}

/** Combined sizes of every finished image. */
export function selectTotals(state: ImagesState) {
  let original = 0
  let optimized = 0
  let done = 0
  for (const item of state.items) {
    if (item.status === 'done' && item.result) {
      original += item.originalSize
      optimized += item.result.size
      done++
    }
  }
  return { original, optimized, done, count: state.items.length }
}

import type { OutputFormat, SourceFormat } from '@/lib/formats'

export interface EncodeSettings {
  format: OutputFormat
  /** 0–100, used by lossy encoders (MozJPEG, WebP, AVIF). */
  quality: number
  /** Lossless mode for WebP / AVIF. */
  lossless: boolean
  /** OxiPNG optimisation level (1–6). */
  pngLevel: number
}

export interface ProcessRequest {
  id: number
  source: ArrayBuffer
  sourceFormat: SourceFormat
  settings: EncodeSettings
  scales: number[]
}

export interface ProcessedOutput {
  scale: number
  width: number
  height: number
  data: ArrayBuffer
}

export interface ProcessFailure {
  scale: number
  error: string
}

export interface ProcessResult {
  id: number
  sourceWidth: number
  sourceHeight: number
  outputs: ProcessedOutput[]
  failures: ProcessFailure[]
}

export type WorkerResponse =
  | { type: 'result'; result: ProcessResult }
  | { type: 'error'; id: number; error: string }

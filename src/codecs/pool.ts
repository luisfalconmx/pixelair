import type { ProcessRequest, ProcessResult, WorkerResponse } from './types'

type WorkerFactory = () => Worker

interface Job {
  request: ProcessRequest
  resolve: (result: ProcessResult) => void
  reject: (error: Error) => void
  /** Aborted jobs that haven't started yet are skipped. */
  signal?: AbortSignal
}

interface Slot {
  worker: Worker
  job: Job | null
}

export class AbortError extends Error {
  constructor() {
    super('Aborted')
    this.name = 'AbortError'
  }
}

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./codec.worker.ts', import.meta.url), { type: 'module', name: 'codec' })

/** Leaves one core for the UI; WASM encoders are memory hungry so cap the pool. */
export function defaultPoolSize(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2
  return Math.min(4, Math.max(1, cores - 1))
}

/**
 * Small FIFO worker pool. Each job runs entirely in one worker (decode → resize → encode),
 * so multiple images are optimised in parallel.
 */
export class CodecPool {
  private readonly slots: Slot[] = []
  private readonly queue: Job[] = []
  private nextId = 1

  constructor(
    private readonly size = defaultPoolSize(),
    private readonly factory: WorkerFactory = defaultFactory,
  ) {}

  run(request: Omit<ProcessRequest, 'id'>, signal?: AbortSignal): Promise<ProcessResult> {
    if (signal?.aborted) return Promise.reject(new AbortError())
    return new Promise((resolve, reject) => {
      this.queue.push({ request: { ...request, id: this.nextId++ }, resolve, reject, signal })
      this.pump()
    })
  }

  get pending(): number {
    return this.queue.length + this.slots.filter((s) => s.job).length
  }

  terminate(): void {
    for (const slot of this.slots) slot.worker.terminate()
    this.slots.length = 0
    for (const job of this.queue.splice(0)) job.reject(new AbortError())
  }

  private pump(): void {
    while (this.queue.length > 0) {
      const slot = this.idleSlot()
      if (!slot) return
      const job = this.queue.shift() as Job
      if (job.signal?.aborted) {
        job.reject(new AbortError())
        continue
      }
      slot.job = job
      slot.worker.postMessage(job.request, [job.request.source])
    }
  }

  private idleSlot(): Slot | undefined {
    const idle = this.slots.find((s) => !s.job)
    if (idle) return idle
    if (this.slots.length >= this.size) return undefined
    const slot: Slot = { worker: this.factory(), job: null }
    slot.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) =>
      this.settle(slot, event.data),
    )
    slot.worker.addEventListener('error', (event) => this.crash(slot, event.message))
    this.slots.push(slot)
    return slot
  }

  private settle(slot: Slot, response: WorkerResponse): void {
    const job = slot.job
    slot.job = null
    if (job) {
      if (response.type === 'result') job.resolve(response.result)
      else job.reject(new Error(response.error))
    }
    this.pump()
  }

  /** A worker that crashes (e.g. WASM out of memory) is replaced by a fresh one. */
  private crash(slot: Slot, message: string): void {
    slot.worker.terminate()
    this.slots.splice(this.slots.indexOf(slot), 1)
    slot.job?.reject(new Error(message || 'Codec worker crashed'))
    this.pump()
  }
}

let shared: CodecPool | null = null

export function getCodecPool(): CodecPool {
  shared ??= new CodecPool()
  return shared
}

import { AbortError, CodecPool } from './pool'
import type { ProcessRequest, WorkerResponse } from './types'

/** Minimal Worker double that answers when `respond()` is called. */
class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = []
  received: ProcessRequest[] = []
  terminated = false

  constructor() {
    super()
    FakeWorker.instances.push(this)
  }

  postMessage(request: ProcessRequest) {
    this.received.push(request)
  }

  respond(response: WorkerResponse) {
    this.dispatchEvent(new MessageEvent('message', { data: response }))
  }

  crash(message: string) {
    const event = new Event('error') as ErrorEvent
    Object.defineProperty(event, 'message', { value: message })
    this.dispatchEvent(event)
  }

  terminate() {
    this.terminated = true
  }
}

const request = () => ({
  source: new ArrayBuffer(4),
  sourceFormat: 'png' as const,
  settings: { format: 'png' as const, quality: 100, lossless: false, pngLevel: 2 },
  scales: [1],
})

const ok = (id: number): WorkerResponse => ({
  type: 'result',
  result: { id, sourceWidth: 1, sourceHeight: 1, outputs: [], failures: [] },
})

beforeEach(() => {
  FakeWorker.instances = []
})

const createPool = (size: number) =>
  new CodecPool(size, () => new FakeWorker() as unknown as Worker)

describe('CodecPool', () => {
  it('runs up to `size` jobs in parallel and queues the rest', async () => {
    const pool = createPool(2)
    const jobs = [pool.run(request()), pool.run(request()), pool.run(request())]
    expect(FakeWorker.instances).toHaveLength(2)
    expect(pool.pending).toBe(3)

    const [w1, w2] = FakeWorker.instances
    w1.respond(ok(w1.received[0].id))
    // the queued job goes to the worker that became free
    expect(w1.received).toHaveLength(2)
    w2.respond(ok(w2.received[0].id))
    w1.respond(ok(w1.received[1].id))

    const results = await Promise.all(jobs)
    expect(results.map((r) => r.id)).toEqual([1, 2, 3])
    expect(pool.pending).toBe(0)
  })

  it('rejects with the worker error message', async () => {
    const pool = createPool(1)
    const job = pool.run(request())
    FakeWorker.instances[0].respond({ type: 'error', id: 1, error: 'bad image' })
    await expect(job).rejects.toThrow('bad image')
  })

  it('skips queued jobs that were aborted', async () => {
    const pool = createPool(1)
    const first = pool.run(request())
    const controller = new AbortController()
    const second = pool.run(request(), controller.signal)
    controller.abort()
    const [worker] = FakeWorker.instances
    worker.respond(ok(1))
    await first
    await expect(second).rejects.toBeInstanceOf(AbortError)
    expect(worker.received).toHaveLength(1)
  })

  it('replaces a crashed worker', async () => {
    const pool = createPool(1)
    const job = pool.run(request())
    FakeWorker.instances[0].crash('out of memory')
    await expect(job).rejects.toThrow('out of memory')
    expect(FakeWorker.instances[0].terminated).toBe(true)

    const next = pool.run(request())
    expect(FakeWorker.instances).toHaveLength(2)
    FakeWorker.instances[1].respond(ok(2))
    await expect(next).resolves.toMatchObject({ id: 2 })
  })
})

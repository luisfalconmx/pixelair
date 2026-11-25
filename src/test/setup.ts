import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom doesn't implement object URLs
let urlCounter = 0
URL.createObjectURL ??= vi.fn(() => `blob:mock/${urlCounter++}`)
URL.revokeObjectURL ??= vi.fn()

afterEach(() => {
  cleanup()
})

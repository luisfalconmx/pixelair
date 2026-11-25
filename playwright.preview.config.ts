import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/** Runs the E2E suite against the production build served with the desktop CSP. */
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})

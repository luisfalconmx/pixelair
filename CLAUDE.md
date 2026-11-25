# Pixelair

Desktop image optimizer (Squoosh-like) built with Tauri 2 + Vite + React 19 + HeroUI v3 + Tailwind v4.

## Rules

- **Never install tooling on the host.** Run everything through Docker: `make <target>` or
  `docker compose run --rm dev <cmd>` (e.g. `docker compose run --rm dev pnpm add zod`).
- Package manager is **pnpm** only.
- Commits follow Conventional Commits; scopes are listed in `commitlint.config.ts`.
- Before finishing a change run `make lint typecheck test` (and `make e2e` / `make cargo-test` when relevant).

## Conventions

- Formatting/linting: Biome (2 spaces, single quotes, no semicolons, width 100). Don't add ESLint/Prettier.
- UI: use HeroUI v3 compound components (`Card.Header`, …) imported from `@heroui/react`; styling with Tailwind utilities.
  HeroUI docs are available via the `heroui` MCP server and the `heroui-react` skill.
- Unit tests sit next to the code as `*.test.tsx` (Vitest globals + RTL + jest-dom).
- E2E specs live in `e2e/` and run against the Vite dev server on port 1420. Mock Tauri APIs with `@tauri-apps/api/mocks`.
- Rust: commands go in `src-tauri/src/lib.rs` (or modules under it) and must pass `cargo fmt` + `clippy -D warnings`.
  New Tauri permissions go in `src-tauri/capabilities/default.json`.

## Architecture

- `src/codecs/codec.worker.ts`: decode → resize → encode with jSquash (Squoosh WASM codecs). `pool.ts` runs jobs in parallel workers.
- `src/store/images.ts`: zustand store with the queue, per-image settings, debounced re-encoding and export.
- `src/platform/export.ts`: native folder dialog + `save_output` Rust command (raw IPC body) in Tauri; browser downloads otherwise.
- `src-tauri/src/export.rs`: writes files, rejects path traversal, never overwrites.
- E2E runs on Chromium (≈ WebView2) and WebKit (≈ WebKitGTK/WKWebView); `pnpm e2e:prod` checks the production build under the desktop CSP.

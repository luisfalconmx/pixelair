# Pixelair

Lightweight desktop image optimizer inspired by [Squoosh](https://squoosh.app/).
Drop JPG, PNG, WebP or AVIF files, shrink them without visible quality loss and strip their metadata — all locally, offline.

> Status: **foundations only**. The image-processing logic comes next.

## Stack

| Area            | Tooling                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Desktop shell   | [Tauri 2](https://v2.tauri.app/) (Rust)                                                                                                                                  |
| Frontend        | [Vite 8](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript 7                                                                                              |
| UI              | [HeroUI v3](https://heroui.com/) + [Tailwind CSS v4](https://tailwindcss.com/)                                                                                           |
| Lint / format   | [Biome](https://biomejs.dev/) (JS/TS/CSS/JSON), `rustfmt` + `clippy` (Rust)                                                                                              |
| Unit tests      | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)                                                   |
| E2E tests       | [Playwright](https://playwright.dev/)                                                                                                                                    |
| Package manager | [pnpm](https://pnpm.io/) (pinned via `packageManager` + corepack)                                                                                                        |
| Git hooks       | [husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) + [commitlint](https://commitlint.js.org/) (Conventional Commits) |
| CI/CD           | GitHub Actions (`.github/workflows`)                                                                                                                                     |
| Dev environment | Docker (`docker/Dockerfile`, `compose.yaml`)                                                                                                                             |

## Requirements

Only **Docker** (with Compose) and **make**. Node, pnpm, Rust and the Tauri system libraries live inside the container.
Caches (pnpm store, cargo registry, Playwright browsers) are kept in named Docker volumes.

## Getting started

```bash
make setup     # build the image, install deps and Playwright's Chromium
make dev       # Vite dev server → http://localhost:1420
make tauri     # native Tauri window (WSLg on Windows 11, or an X11/Wayland host)
```

Run `make help` for every command. The most common ones:

| Command                               | What it does                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `make shell`                          | Shell inside the dev container                                                   |
| `make lint` / `make lint-fix`         | Biome check / autofix                                                            |
| `make typecheck`                      | `tsc -b`                                                                         |
| `make test` / `make coverage`         | Vitest                                                                           |
| `make e2e`                            | Playwright against the Vite dev server                                           |
| `make cargo-lint` / `make cargo-test` | rustfmt + clippy / cargo test                                                    |
| `make check`                          | Everything CI runs                                                               |
| `make tauri-build`                    | Linux bundles (`.deb`, `.rpm`, `.AppImage`) in `src-tauri/target/release/bundle` |

Windows and macOS installers are built by GitHub Actions.

## Git workflow

- Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(ui): add drop zone`). Allowed scopes live in `commitlint.config.ts`.
- `pre-commit` runs lint-staged (Biome + `cargo fmt`), `commit-msg` runs commitlint.
- Hooks call `scripts/run.sh`, which executes them inside the dev container, so committing from the host works without Node installed.

## CI/CD

- **`ci.yml`** (push to `main`, PRs): commitlint (PRs), Biome + typecheck + Vitest with coverage, Playwright E2E, Rust fmt/clippy/tests, then cross-platform Tauri builds (Linux, Windows, macOS universal) uploaded as artifacts on `main`.
- **`release.yml`** (tags `v*`): builds every platform and creates a draft GitHub release with the installers.

## AI tooling

- **MCP servers** (`.mcp.json`): Playwright (`mcr.microsoft.com/playwright/mcp`, reaches the dev server at `http://host.docker.internal:1420`) and HeroUI docs (`@heroui/react-mcp`). Both run in Docker.
- **Agent skills** (`.claude/skills`, tracked in `skills-lock.json`) installed with [skills.sh](https://skills.sh/): `find-skills`, `changelog-generator`, `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `heroui-react`, `heroui-theming`, `webapp-testing`, `frontend-design`.
  Restore or update them with `make shell` → `npx skills experimental_install` / `npx skills update`.

## Project layout

```
├── docker/Dockerfile      # dev image (Rust + Tauri libs + Node + pnpm + Playwright deps)
├── compose.yaml           # dev + tauri (GUI) services
├── src/                   # React app
├── e2e/                   # Playwright specs
├── src-tauri/             # Rust / Tauri app
└── .github/workflows/     # CI and release
```

## License

[MIT](./LICENSE)

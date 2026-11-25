# Thin wrappers around `docker compose` so nothing needs to be installed on the host.
COMPOSE := docker compose
RUN     := $(COMPOSE) run --rm dev
export UID := $(shell id -u)
export GID := $(shell id -g)

.DEFAULT_GOAL := help
.PHONY: help build setup install shell dev tauri tauri-build lint lint-fix typecheck test test-watch coverage e2e e2e-prod cargo-test cargo-lint check clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

build: ## Build the dev Docker image
	$(COMPOSE) build dev

setup: build install ## Build image, install deps and Playwright browsers
	$(RUN) pnpm e2e:install

install: ## Install JS dependencies (pnpm)
	$(RUN) pnpm install

shell: ## Open a shell inside the dev container
	$(RUN) bash

dev: ## Run the Vite dev server on http://localhost:1420
	$(COMPOSE) run --rm --service-ports dev pnpm dev

tauri: ## Run the native Tauri window (WSLg / X11)
	$(COMPOSE) run --rm tauri

tauri-build: ## Build Linux bundles (deb, rpm, AppImage) into src-tauri/target
	$(RUN) pnpm tauri build

lint: ## Biome lint + format check
	$(RUN) pnpm lint

lint-fix: ## Biome autofix
	$(RUN) pnpm lint:fix

typecheck: ## TypeScript type check
	$(RUN) pnpm typecheck

test: ## Unit tests (Vitest + RTL)
	$(RUN) pnpm test

test-watch: ## Unit tests in watch mode
	$(RUN) pnpm test:watch

coverage: ## Unit tests with coverage
	$(RUN) pnpm test:coverage

e2e: ## E2E tests (Playwright, Chromium + WebKit)
	$(RUN) pnpm e2e

e2e-prod: ## E2E against the production build with the desktop CSP
	$(RUN) pnpm e2e:prod

cargo-test: ## Rust tests
	$(RUN) bash -c 'cd src-tauri && cargo test'

cargo-lint: ## rustfmt + clippy
	$(RUN) bash -c 'cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings'

check: lint typecheck test cargo-lint cargo-test e2e ## Everything CI runs

clean: ## Remove build artifacts
	rm -rf dist coverage playwright-report test-results

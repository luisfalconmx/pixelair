# Pixelair development image
# Contains everything needed to develop, test and build the app:
# Rust + Tauri system libs, Node.js + pnpm and Playwright browsers' system deps.

ARG NODE_VERSION=24
ARG RUST_VERSION=1

FROM node:${NODE_VERSION}-bookworm AS node

FROM rust:${RUST_VERSION}-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# Tauri v2 Linux prerequisites (https://v2.tauri.app/start/prerequisites/#linux)
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      ca-certificates \
      curl \
      file \
      git \
      libayatana-appindicator3-dev \
      librsvg2-dev \
      libssl-dev \
      libwebkit2gtk-4.1-dev \
      libxdo-dev \
      sudo \
      wget \
      xdg-utils \
    && rm -rf /var/lib/apt/lists/*

RUN rustup component add rustfmt clippy

# Node.js from the official image (keeps versions in sync with CI)
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && ln -s /usr/local/lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack

# System dependencies for Playwright browsers (browsers themselves live in a volume)
RUN npx -y playwright@latest install-deps chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm

# Non-root user that matches the host user so files created in the
# bind-mounted repo keep the right ownership.
ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=1000
RUN set -eux; \
    if getent passwd ${USER_UID}; then userdel -r "$(getent passwd ${USER_UID} | cut -d: -f1)"; fi; \
    if ! getent group ${USER_GID}; then groupadd --gid ${USER_GID} ${USERNAME}; fi; \
    useradd --uid ${USER_UID} --gid ${USER_GID} -m -s /bin/bash ${USERNAME}; \
    echo "${USERNAME} ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME}; \
    mkdir -p /pnpm/store /pnpm/corepack /ms-playwright /cargo-home; \
    chown -R ${USER_UID}:${USER_GID} /pnpm /ms-playwright /cargo-home /usr/local/lib/node_modules /usr/local/bin

ENV PNPM_HOME=/pnpm \
    pnpm_config_store_dir=/pnpm/store \
    COREPACK_HOME=/pnpm/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    CARGO_HOME=/cargo-home \
    PATH=/pnpm:/cargo-home/bin:/usr/local/cargo/bin:$PATH

USER ${USERNAME}
RUN corepack enable --install-directory /pnpm

WORKDIR /app

CMD ["bash"]

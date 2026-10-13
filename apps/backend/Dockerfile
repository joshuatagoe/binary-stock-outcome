# The backend's image, for Fly.io and the standby (P17, D124). Build from the repository's root:
#   docker build -f apps/backend/Dockerfile --build-arg GIT_COMMIT=$(git rev-parse HEAD) -t meridian-backend .
# Node's official image at the pinned version, pinned by digest (scripts/toolchain/pins.sh's NODE).
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20

WORKDIR /app

# Litestream at its pin, refused unless its SHA-256 matches pins.sh (P22). The image has no curl, so Node fetches it.
COPY scripts/toolchain/pins.sh /tmp/pins.sh
RUN . /tmp/pins.sh \
  && node -e "fetch(process.argv[1]).then(async (r) => { if (!r.ok) throw new Error('HTTP ' + r.status); require('node:fs').writeFileSync('/tmp/litestream.tar.gz', Buffer.from(await r.arrayBuffer())); })" \
     "https://github.com/benbjohnson/litestream/releases/download/v$LITESTREAM/litestream-$LITESTREAM-linux-x86_64.tar.gz" \
  && echo "$LITESTREAM_SHA256  /tmp/litestream.tar.gz" | sha256sum -c - \
  && tar -xzf /tmp/litestream.tar.gz -C /usr/local/bin litestream \
  && rm /tmp/litestream.tar.gz /tmp/pins.sh \
  && litestream version

# The backend's packages only, from the lockfile. @meridian/shared and @meridian/client are workspaces it depends on (M4-b): npm links
# them into node_modules, and Node runs their TypeScript sources directly, so their folders go in with the code below.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
COPY clients/ts/package.json clients/ts/
RUN npm ci --omit=dev --workspace apps/backend --no-audit --no-fund

COPY config config
COPY packages/shared/src packages/shared/src
COPY clients/ts/src clients/ts/src
COPY apps/backend apps/backend

# The store's folder. On Fly.io a volume is mounted over it; the standby may run without one (D98).
RUN mkdir -p /data

ARG GIT_COMMIT=unknown
ENV NODE_ENV=production GIT_COMMIT=$GIT_COMMIT DATABASE_PATH=/data/meridian.db PORT=8080
EXPOSE 8080
CMD ["sh", "/app/apps/backend/start.sh"]

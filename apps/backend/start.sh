#!/bin/sh
# Starts the backend (P17, D134). Fly.io's daily volume snapshots back the store up, so Litestream is off unless
# R2 settings are present. When it is on, an empty volume is first restored from the replica, if one exists;
# then Litestream replicates the store while it runs the app, and stops when the app stops.
# LITESTREAM_CONFIG points elsewhere for a local test with a file replica.
set -eu
app="node /app/apps/backend/src/main.ts"
# The standby keeps its own store and never touches the primary's backup: the store doesn't fail over (D98).
if [ "${MERIDIAN_ROLE:-primary}" = standby ]; then
  exec $app
fi
if [ -z "${LITESTREAM_CONFIG:-}" ] && [ -z "${R2_BUCKET:-}" ]; then
  echo "start.sh: Litestream is off (no R2_BUCKET); Fly.io's daily volume snapshots back the store up (D134)" >&2
  exec $app
fi
config="${LITESTREAM_CONFIG:-/app/apps/backend/litestream.yml}"
litestream restore -config "$config" -if-db-not-exists -if-replica-exists "$DATABASE_PATH"
exec litestream replicate -config "$config" -exec "$app"

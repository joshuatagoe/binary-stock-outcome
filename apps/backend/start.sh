#!/bin/sh
# Starts the backend under Litestream (P17). An empty volume is first restored from the replica, if one exists;
# then Litestream replicates the store while it runs the app, and stops when the app stops.
# LITESTREAM_CONFIG points elsewhere for a local test with a file replica.
set -eu
# The standby keeps its own store and never touches the primary's backup: the store doesn't fail over (D98).
if [ "${MERIDIAN_ROLE:-primary}" = standby ]; then
  exec node /app/apps/backend/src/main.ts
fi
config="${LITESTREAM_CONFIG:-/app/apps/backend/litestream.yml}"
litestream restore -config "$config" -if-db-not-exists -if-replica-exists "$DATABASE_PATH"
exec litestream replicate -config "$config" -exec "node /app/apps/backend/src/main.ts"

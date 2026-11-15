#!/bin/sh
set -eu

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "deploy/.env is missing; copy the production .env here first" >&2
  exit 1
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sub2api-postgres}"
if ! docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1; then
  echo "PostgreSQL container not found: $POSTGRES_CONTAINER" >&2
  exit 1
fi

SUB2API_NETWORK="${SUB2API_NETWORK:-$(docker inspect \
  --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}' \
  "$POSTGRES_CONTAINER")}"
if [ -z "$SUB2API_NETWORK" ]; then
  echo "Could not detect the existing Docker network" >&2
  exit 1
fi

CANDIDATE_PORT="${CANDIDATE_PORT:-18080}"
CANDIDATE_TAG="${CANDIDATE_TAG:-candidate-$(date +%Y%m%d-%H%M%S)}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
mkdir -p "$BACKUP_DIR" data-candidate

if [ -f data/config.yaml ] && [ ! -f data-candidate/config.yaml ]; then
  cp data/config.yaml data-candidate/config.yaml
fi

backup_file="$BACKUP_DIR/sub2api-before-candidate-$(date +%Y%m%d-%H%M%S).dump"
echo "Backing up PostgreSQL to $backup_file"
docker exec "$POSTGRES_CONTAINER" sh -lc \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_file"

echo "Docker network: $SUB2API_NETWORK"
echo "Building and starting candidate on 127.0.0.1:$CANDIDATE_PORT"
SUB2API_NETWORK="$SUB2API_NETWORK" \
CANDIDATE_PORT="$CANDIDATE_PORT" \
CANDIDATE_TAG="$CANDIDATE_TAG" \
docker compose -f docker-compose.candidate.yml up -d --build

health_url="http://127.0.0.1:$CANDIDATE_PORT/health"
attempt=1
while [ "$attempt" -le 30 ]; do
  if curl -fsS --max-time 5 "$health_url" >/dev/null 2>&1; then
    echo "Candidate is healthy: $health_url"
    echo "Old production container is still running and untouched."
    echo "Candidate image tag: $CANDIDATE_TAG"
    echo "Database backup: $backup_file"
    exit 0
  fi
  sleep 3
  attempt=$((attempt + 1))
done

echo "Candidate did not become healthy within 90 seconds" >&2
echo "Inspect logs with: docker logs --tail 200 sub2api-candidate" >&2
exit 1

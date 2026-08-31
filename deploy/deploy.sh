#!/usr/bin/env bash
# Deploy control for money-motion-app -> gmktec home server. Run from the Mac.
# Usage: deploy/deploy.sh <init|deploy|db-push|db-pull|logs|status|restart|stop>
set -euo pipefail

HOST="${DEPLOY_HOST:-gmktec}"
ROOT="${DEPLOY_ROOT:-apps/money-motion-app}"   # relative to $HOME on the server
SRC="$ROOT/src"
DATA="$ROOT/data"
COMPOSE="docker compose -f deploy/compose.yml"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_DB="$REPO_ROOT/data/money-motion.sqlite"

stamp() { date +%Y%m%d-%H%M%S; }

confirm() {
  read -r -p "$1 [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]]
}

cmd_init() {
  ssh "$HOST" "mkdir -p ~/$SRC ~/$DATA"
  if ssh "$HOST" "test -f ~/$ROOT/env"; then
    echo "env file already exists on server -- leaving it alone"
  else
    scp "$REPO_ROOT/deploy/env.example" "$HOST:$ROOT/env"
    echo "uploaded env template -> ~/$ROOT/env  (ssh in and fill real values)"
  fi
  echo "init done: ~/$ROOT/{src,data,env} ready on $HOST"
}

cmd_deploy() {
  cd "$REPO_ROOT"
  if ! git diff-index --quiet HEAD --; then
    echo "warning: uncommitted changes -- deploying committed HEAD only" >&2
  fi
  local tmp
  tmp="$(mktemp -d)"
  # expand $tmp now: it's a local and would be gone when the EXIT trap fires
  trap "rm -rf '$tmp'" EXIT
  git archive HEAD | tar -x -C "$tmp"
  rsync -az --delete "$tmp"/ "$HOST:$SRC/"
  # make the bind-mount target ourselves: if docker creates it, it lands
  # root-owned and the uid-1000 container can't write the sqlite file
  ssh "$HOST" "mkdir -p ~/$DATA"
  # migrate is a separate build target (builder stage) from the same
  # Dockerfile as app -- compose won't rebuild an existing image on `run`
  # unless told to, so without building it explicitly here it silently keeps
  # using whatever schema.prisma was baked in the first time it was ever
  # built, and every later `db push` against the real (current) schema
  # reports "already in sync" against a schema it's not actually checking.
  ssh "$HOST" "set -e; cd ~/$SRC; $COMPOSE build app migrate; $COMPOSE run --rm migrate; $COMPOSE up -d app"
  echo "deployed $(git rev-parse --short HEAD) -> http://gmktec.local:3003"
}

cmd_db_push() {
  [[ -f "$LOCAL_DB" ]] || { echo "no local db at $LOCAL_DB" >&2; exit 1; }
  confirm "Overwrite the SERVER database with your local copy?" || exit 1
  ssh "$HOST" "if [ -f ~/$DATA/money-motion.sqlite ]; then cp ~/$DATA/money-motion.sqlite ~/$DATA/money-motion.sqlite.backup-$(stamp); fi"
  scp "$LOCAL_DB" "$HOST:$DATA/money-motion.sqlite"
  # restart so the app reopens the new file instead of holding the old one
  ssh "$HOST" "cd ~/$SRC 2>/dev/null && $COMPOSE restart app || true"
  echo "local db pushed to server (server copy backed up first)"
}

cmd_db_pull() {
  confirm "Overwrite your LOCAL database with the server copy?" || exit 1
  [[ -f "$LOCAL_DB" ]] && cp "$LOCAL_DB" "$LOCAL_DB.backup-$(stamp)"
  scp "$HOST:$DATA/money-motion.sqlite" "$LOCAL_DB"
  echo "server db pulled to $LOCAL_DB (local copy backed up first)"
}

cmd_logs()    { ssh "$HOST" "cd ~/$SRC && $COMPOSE logs -f --tail=200 app"; }
cmd_status()  { ssh "$HOST" "cd ~/$SRC && $COMPOSE ps"; }
cmd_restart() { ssh "$HOST" "cd ~/$SRC && $COMPOSE restart app"; }
cmd_stop()    { ssh "$HOST" "cd ~/$SRC && $COMPOSE stop app"; }

case "${1:-}" in
  init)     cmd_init ;;
  deploy)   cmd_deploy ;;
  db-push)  cmd_db_push ;;
  db-pull)  cmd_db_pull ;;
  logs)     cmd_logs ;;
  status)   cmd_status ;;
  restart)  cmd_restart ;;
  stop)     cmd_stop ;;
  *) echo "usage: $0 <init|deploy|db-push|db-pull|logs|status|restart|stop>" >&2; exit 1 ;;
esac

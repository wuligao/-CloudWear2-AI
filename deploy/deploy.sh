#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT_DIR/deploy/.env.deploy}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

CLOUDWEAR_HOST="${CLOUDWEAR_HOST:-103.242.14.110}"
CLOUDWEAR_API_PORT="${CLOUDWEAR_API_PORT:-9200}"
CLOUDWEAR_H5_PORT="${CLOUDWEAR_H5_PORT:-9300}"
CLOUDWEAR_ADMIN_PORT="${CLOUDWEAR_ADMIN_PORT:-9400}"
CLOUDWEAR_H5_INTERNAL_PORT="${CLOUDWEAR_H5_INTERNAL_PORT:-3000}"

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_DATABASE="${MYSQL_DATABASE:-vivy-nest-admin}"
MYSQL_USER="${MYSQL_USER:-cloudwear}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_ADMIN_USER="${MYSQL_ADMIN_USER:-root}"
MYSQL_ADMIN_PASSWORD="${MYSQL_ADMIN_PASSWORD:-}"
MYSQL_APP_HOST="${MYSQL_APP_HOST:-127.0.0.1}"

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_USERNAME="${REDIS_USERNAME:-default}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

CREATE_DB="${CREATE_DB:-0}"
IMPORT_SQL="${IMPORT_SQL:-0}"
CONFIRM_IMPORT_SQL="${CONFIRM_IMPORT_SQL:-NO}"
SQL_FILE="${SQL_FILE:-api-server/sql/vivy-nest-admin.sql}"
SKIP_NGINX="${SKIP_NGINX:-0}"
FORCE_CONFIG="${FORCE_CONFIG:-0}"

API_CONFIG_FILE="$ROOT_DIR/api-server/vivy-modules/vivy-system/src/config/config.production.local.yaml"
NGINX_CONF_TARGET="${NGINX_CONF_TARGET:-/etc/nginx/conf.d/cloudwear.conf}"

log() {
  printf '\n[cloudwear] %s\n' "$*"
}

warn() {
  printf '\n[cloudwear][warn] %s\n' "$*" >&2
}

die() {
  printf '\n[cloudwear][error] %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  cp deploy/.env.deploy.example deploy/.env.deploy
  vi deploy/.env.deploy
  bash deploy/deploy.sh

Important flags:
  CREATE_DB=1              Create MySQL database/user before deploy.
  IMPORT_SQL=1             Import the unified SQL file.
  CONFIRM_IMPORT_SQL=YES   Required with IMPORT_SQL=1.
  SQL_FILE=path/to.sql      SQL file to import, defaults to api-server/sql/vivy-nest-admin.sql.
  FORCE_CONFIG=1           Rewrite existing API production config.
  SKIP_NGINX=1             Do not install/reload Nginx config.
USAGE
}

on_error() {
  local line="$1"
  die "deploy failed at line $line"
}
trap 'on_error "$LINENO"' ERR

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

sudo_cmd() {
  if [[ "$(id -u)" == "0" ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

require_cmd() {
  has_cmd "$1" || die "missing command: $1"
}

require_value() {
  local name="$1"
  local value="${!name:-}"
  [[ -n "$value" ]] || die "missing required env: $name. Copy deploy/.env.deploy.example to deploy/.env.deploy and fill it."
}

mysql_app() {
  MYSQL_PWD="$MYSQL_PASSWORD" mysql \
    -h"$MYSQL_HOST" \
    -P"$MYSQL_PORT" \
    -u"$MYSQL_USER" \
    "$@"
}

mysql_admin() {
  MYSQL_PWD="$MYSQL_ADMIN_PASSWORD" mysql \
    -h"$MYSQL_HOST" \
    -P"$MYSQL_PORT" \
    -u"$MYSQL_ADMIN_USER" \
    "$@"
}

escape_sql_string() {
  printf "%s" "$1" | sed "s/'/''/g"
}

escape_sql_identifier() {
  printf "%s" "$1" | sed 's/`/``/g'
}

yaml_quote() {
  printf "'%s'" "$(printf "%s" "$1" | sed "s/'/''/g")"
}

install_runtime_tools() {
  log "checking runtime tools"

  if ! has_cmd node; then
    die "node is not installed. Install Node 22 first, then rerun this script."
  fi

  if ! has_cmd pnpm; then
    if has_cmd corepack; then
      corepack enable
      corepack prepare pnpm@10.11.0 --activate
    else
      npm install -g pnpm@10.11.0
    fi
  fi

  if ! has_cmd pm2; then
    npm install -g pm2
  fi

  require_cmd npm
  require_cmd pnpm
  require_cmd pm2
  require_cmd mysql
  require_cmd redis-cli

  if [[ "$SKIP_NGINX" != "1" ]]; then
    require_cmd nginx
  fi
}

check_database_services() {
  require_value MYSQL_PASSWORD

  log "checking MySQL at $MYSQL_HOST:$MYSQL_PORT"
  mysql_app -e "SELECT VERSION();" >/dev/null
  mysql_app "$MYSQL_DATABASE" -e "SELECT 1;" >/dev/null

  log "checking Redis at $REDIS_HOST:$REDIS_PORT"
  if [[ -n "$REDIS_PASSWORD" ]]; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping >/dev/null
  else
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null
  fi
}

create_database_if_needed() {
  if [[ "$CREATE_DB" != "1" ]]; then
    return
  fi

  require_value MYSQL_ADMIN_PASSWORD
  require_value MYSQL_PASSWORD

  local db user host pass
  db="$(escape_sql_identifier "$MYSQL_DATABASE")"
  user="$(escape_sql_string "$MYSQL_USER")"
  host="$(escape_sql_string "$MYSQL_APP_HOST")"
  pass="$(escape_sql_string "$MYSQL_PASSWORD")"

  log "creating MySQL database and user if needed"
  mysql_admin <<SQL
CREATE DATABASE IF NOT EXISTS \`$db\`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$user'@'$host' IDENTIFIED BY '$pass';
GRANT ALL PRIVILEGES ON \`$db\`.* TO '$user'@'$host';
FLUSH PRIVILEGES;
SQL
}

write_api_config() {
  if [[ -f "$API_CONFIG_FILE" && "$FORCE_CONFIG" != "1" ]]; then
    log "keeping existing API config: $API_CONFIG_FILE"
    return
  fi

  log "writing API production config"
  mkdir -p "$(dirname "$API_CONFIG_FILE")"

  {
    printf 'datasource:\n'
    printf '  defalut:\n'
    printf '    type: mysql\n'
    printf '    host: %s\n' "$(yaml_quote "$MYSQL_HOST")"
    printf '    port: %s\n' "$MYSQL_PORT"
    printf '    username: %s\n' "$(yaml_quote "$MYSQL_USER")"
    printf '    password: %s\n' "$(yaml_quote "$MYSQL_PASSWORD")"
    printf '    database: %s\n' "$(yaml_quote "$MYSQL_DATABASE")"
    printf '    synchronize: false\n'
    printf '    autoLoadEntities: true\n'
    printf '    bigNumberStrings: false\n'
    printf '    supportBigNumbers: true\n'
    printf '\nredis:\n'
    printf '  defalut:\n'
    printf '    host: %s\n' "$(yaml_quote "$REDIS_HOST")"
    printf '    port: %s\n' "$REDIS_PORT"
    if [[ -n "$REDIS_PASSWORD" ]]; then
      [[ -n "$REDIS_USERNAME" ]] && printf '    username: %s\n' "$(yaml_quote "$REDIS_USERNAME")"
      printf '    password: %s\n' "$(yaml_quote "$REDIS_PASSWORD")"
    fi
    printf '    db: 0\n'
    printf '\nbull:\n'
    printf '  redis:\n'
    printf '    host: %s\n' "$(yaml_quote "$REDIS_HOST")"
    printf '    port: %s\n' "$REDIS_PORT"
    if [[ -n "$REDIS_PASSWORD" ]]; then
      [[ -n "$REDIS_USERNAME" ]] && printf '    username: %s\n' "$(yaml_quote "$REDIS_USERNAME")"
      printf '    password: %s\n' "$(yaml_quote "$REDIS_PASSWORD")"
    fi
    printf '    db: 1\n'

    if [[ -n "${OPENAI_TEXT_API_KEY:-}" || -n "${OPENAI_IMAGE_API_KEY:-}" ]]; then
      printf '\noutfitAi:\n'
      printf '  textApiKey: %s\n' "$(yaml_quote "${OPENAI_TEXT_API_KEY:-}")"
      printf '  textBaseUrl: %s\n' "$(yaml_quote "${OPENAI_TEXT_BASE_URL:-}")"
      printf '  textModel: %s\n' "$(yaml_quote "${OPENAI_TEXT_MODEL:-}")"
      printf '  imageApiKey: %s\n' "$(yaml_quote "${OPENAI_IMAGE_API_KEY:-}")"
      printf '  imageBaseUrl: %s\n' "$(yaml_quote "${OPENAI_IMAGE_BASE_URL:-}")"
      printf '  imageModel: %s\n' "$(yaml_quote "${OPENAI_IMAGE_MODEL:-}")"
    else
      warn "OPENAI_* values are empty; AI generation may fail until config.production.local.yaml is filled."
    fi
  } >"$API_CONFIG_FILE"

  chmod 600 "$API_CONFIG_FILE"
}

import_sql_if_needed() {
  if [[ "$IMPORT_SQL" != "1" ]]; then
    log "skipping SQL import. Set IMPORT_SQL=1 CONFIRM_IMPORT_SQL=YES to import $SQL_FILE."
    return
  fi

  [[ "$CONFIRM_IMPORT_SQL" == "YES" ]] || die "SQL import is destructive. Set CONFIRM_IMPORT_SQL=YES to continue."
  [[ -f "$ROOT_DIR/$SQL_FILE" ]] || die "SQL file not found: $SQL_FILE"

  log "backing up current database before SQL import"
  mkdir -p "$ROOT_DIR/backups"
  MYSQL_PWD="$MYSQL_PASSWORD" mysqldump \
    -h"$MYSQL_HOST" \
    -P"$MYSQL_PORT" \
    -u"$MYSQL_USER" \
    --single-transaction \
    --routines \
    --triggers \
    "$MYSQL_DATABASE" >"$ROOT_DIR/backups/${MYSQL_DATABASE}-before-$(date +%Y%m%d%H%M%S).sql"

  log "importing unified SQL file: $SQL_FILE"
  mysql_app "$MYSQL_DATABASE" <"$ROOT_DIR/$SQL_FILE"
}

build_api() {
  log "building API server"
  cd "$ROOT_DIR/api-server"
  pnpm install --frozen-lockfile
  pnpm run build
  pm2 startOrReload ecosystem.config.cjs --env production
  cd "$ROOT_DIR"
}

build_h5() {
  log "building H5 app"
  cd "$ROOT_DIR/h5-app"
  printf 'NEXT_PUBLIC_API_BASE_URL=http://%s:%s\n' "$CLOUDWEAR_HOST" "$CLOUDWEAR_API_PORT" >.env.production
  npm ci
  npm run build

  if pm2 describe cloudwear-h5 >/dev/null 2>&1; then
    pm2 delete cloudwear-h5
  fi
  pm2 start npm --name cloudwear-h5 -- run start -- -p "$CLOUDWEAR_H5_INTERNAL_PORT"
  cd "$ROOT_DIR"
}

build_admin() {
  log "building admin web"
  cd "$ROOT_DIR/admin-web"
  pnpm install --frozen-lockfile
  pnpm run build
  cd "$ROOT_DIR"
}

install_nginx_config() {
  if [[ "$SKIP_NGINX" == "1" ]]; then
    log "skipping Nginx config"
    return
  fi

  log "installing Nginx config"
  local tmp_conf
  tmp_conf="$(mktemp)"
  cat >"$tmp_conf" <<NGINX
server {
  listen ${CLOUDWEAR_H5_PORT};
  server_name ${CLOUDWEAR_HOST};

  location / {
    proxy_pass http://127.0.0.1:${CLOUDWEAR_H5_INTERNAL_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}

server {
  listen ${CLOUDWEAR_ADMIN_PORT};
  server_name ${CLOUDWEAR_HOST};

  root ${ROOT_DIR}/admin-web/dist;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:${CLOUDWEAR_API_PORT}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:${CLOUDWEAR_API_PORT}/uploads/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX

  sudo_cmd install -m 0644 "$tmp_conf" "$NGINX_CONF_TARGET"
  rm -f "$tmp_conf"
  sudo_cmd nginx -t
  sudo_cmd nginx -s reload
}

save_pm2() {
  log "saving PM2 process list"
  pm2 save
}

verify_deploy() {
  log "verifying deployment"

  curl -fsS "http://127.0.0.1:${CLOUDWEAR_API_PORT}/" >/dev/null

  if ! curl -fsS "http://127.0.0.1:${CLOUDWEAR_API_PORT}/health" >/dev/null; then
    warn "API /health failed. It checks an external network URL too, so verify app logs before treating this as fatal."
  fi

  curl -fsSI "http://127.0.0.1:${CLOUDWEAR_H5_INTERNAL_PORT}/login" >/dev/null

  if [[ "$SKIP_NGINX" != "1" ]]; then
    curl -fsSI "http://${CLOUDWEAR_HOST}:${CLOUDWEAR_H5_PORT}/" >/dev/null
    curl -fsSI "http://${CLOUDWEAR_HOST}:${CLOUDWEAR_ADMIN_PORT}/" >/dev/null
  fi
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  log "deploying CloudWear AI from $ROOT_DIR"
  install_runtime_tools
  create_database_if_needed
  check_database_services
  write_api_config
  import_sql_if_needed
  build_api
  build_h5
  build_admin
  install_nginx_config
  save_pm2
  verify_deploy

  log "deployment finished"
  printf '\nAPI:   http://%s:%s/swagger\n' "$CLOUDWEAR_HOST" "$CLOUDWEAR_API_PORT"
  printf 'H5:    http://%s:%s/\n' "$CLOUDWEAR_HOST" "$CLOUDWEAR_H5_PORT"
  printf 'Admin: http://%s:%s/\n' "$CLOUDWEAR_HOST" "$CLOUDWEAR_ADMIN_PORT"
}

main "$@"

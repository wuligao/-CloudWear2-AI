FROM node:22-bookworm-slim AS build

WORKDIR /app/admin-web

ARG NPM_REGISTRY=https://registry.npmmirror.com

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY admin-web/package.json admin-web/pnpm-lock.yaml ./
RUN pnpm config set registry "$NPM_REGISTRY" \
  && pnpm config set fetch-retries 5 \
  && pnpm config set fetch-retry-factor 2 \
  && pnpm config set fetch-retry-mintimeout 20000 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm install --frozen-lockfile

COPY admin-web ./
RUN pnpm run build

FROM nginx:1.27-alpine

COPY deploy/docker/admin-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin-web/dist /usr/share/nginx/html

EXPOSE 9400

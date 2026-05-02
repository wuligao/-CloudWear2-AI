FROM node:22-bookworm-slim AS build

WORKDIR /app/admin-web

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY admin-web/package.json admin-web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY admin-web ./
RUN pnpm run build

FROM nginx:1.27-alpine

COPY deploy/docker/admin-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin-web/dist /usr/share/nginx/html

EXPOSE 9400

FROM node:22-bookworm-slim

WORKDIR /app/api-server

ARG NPM_REGISTRY=https://registry.npmmirror.com

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY api-server/package.json api-server/pnpm-lock.yaml api-server/pnpm-workspace.yaml ./
COPY api-server/tsconfig.json api-server/nest-cli.json ./
COPY api-server/vivy-common ./vivy-common
COPY api-server/vivy-modules ./vivy-modules
COPY deploy/docker/api-config.production.local.yaml ./vivy-modules/vivy-system/src/config/config.production.local.yaml

RUN pnpm config set registry "$NPM_REGISTRY" \
  && pnpm install --frozen-lockfile \
  && pnpm --filter=@vivy-common/common clean \
  && pnpm run build:common \
  && pnpm --filter=vivy-system build \
  && cd vivy-modules/vivy-system \
  && find src -type f \( -name '*.yaml' -o -name '*.xml' -o -name '*.hbs' \) -exec sh -c 'for file do target="dist/${file#src/}"; mkdir -p "$(dirname "$target")"; cp "$file" "$target"; done' sh {} + \
  && cp src/config/config.production.local.yaml dist/config/config.production.local.yaml

WORKDIR /app/api-server/vivy-modules/vivy-system

EXPOSE 9200

CMD ["node", "dist/main.js"]

FROM node:22-bookworm-slim

WORKDIR /app/h5-app

ARG TARGETARCH
ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG NEXT_PUBLIC_API_BASE_URL=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY h5-app/package.json h5-app/package-lock.json ./
RUN npm config set registry "$NPM_REGISTRY" \
  && npm config set replace-registry-host always \
  && npm config set fetch-retries 5 \
  && npm config set fetch-retry-factor 2 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --include=dev \
  && arch="${TARGETARCH:-$(uname -m)}" \
  && case "$arch" in \
    amd64|x86_64) npm install --no-save --include=optional @next/swc-linux-x64-gnu@16.2.4 ;; \
    arm64|aarch64) npm install --no-save --include=optional @next/swc-linux-arm64-gnu@16.2.4 ;; \
    *) echo "Unsupported Docker build architecture: $arch" && exit 1 ;; \
  esac

COPY h5-app ./
RUN npm run build

ENV NODE_ENV=production

EXPOSE 9300

CMD ["npm", "run", "start", "--", "-p", "9300"]

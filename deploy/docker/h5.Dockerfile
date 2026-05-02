FROM node:22-bookworm-slim

WORKDIR /app/h5-app

ARG NEXT_PUBLIC_API_BASE_URL=http://103.242.14.110:9200
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NODE_ENV=production

COPY h5-app/package.json h5-app/package-lock.json ./
RUN npm ci

COPY h5-app ./
RUN npm run build

EXPOSE 9300

CMD ["npm", "run", "start", "--", "-p", "9300"]

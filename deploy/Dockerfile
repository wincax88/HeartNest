FROM node@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS build
WORKDIR /workspace/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build:h5

FROM node@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
ENV NODE_ENV=production PORT=8080 HEARTNEST_DATA_FILE=/tmp/heartnest.json HEARTNEST_STATIC_ROOT=/app/public
WORKDIR /app/server
COPY app/server/package.json app/server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /workspace/app/dist/build/h5/ /app/public/
COPY --chown=node:node app/server/ /app/server/
USER node
EXPOSE 8080
CMD ["node", "index.mjs"]

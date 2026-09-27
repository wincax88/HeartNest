FROM node:20-alpine AS build
WORKDIR /workspace/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build:h5

FROM node:20-alpine
ENV NODE_ENV=production PORT=8080 HEARTNEST_DATA_FILE=/data/heartnest.json HEARTNEST_STATIC_ROOT=/app/public
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && chown -R node:node /app
COPY --from=build --chown=node:node /workspace/app/dist/build/h5/ /app/public/
COPY --chown=node:node app/server/ /app/server/
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8080
VOLUME ["/data"]
CMD ["node", "server/index.mjs"]

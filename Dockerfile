# broadsheet as one image. The paper itself is the SQLite file under /data:
# mount a persistent disk there, and run exactly one container per paper.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    BROADSHEET_DB=/data/paper.sqlite \
    PORT=3000
COPY --from=build /app/package.json /app/next.config.mjs ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
# Migrations are read at startup, when the paper's file is opened.
COPY --from=build /app/src/core/db/migrations ./src/core/db/migrations
# The nameplate's typeface, which the paper's icon is drawn with.
COPY --from=build /app/src/app/fonts ./src/app/fonts
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]

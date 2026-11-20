# Private-server image (SPEC §4.1, §3.2). It listens on 0.0.0.0, so it refuses to start without APP_PASSWORD
# (instrumentation-node.ts). Put it behind HTTPS. Data, including the session secret, lives in the /app/data volume,
# never in the image.
#   docker build -t instant-resume .
#   docker run -d -p 127.0.0.1:3000:3000 -e APP_PASSWORD='a long passphrase' -v instant-resume-data:/app/data instant-resume

FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod --ignore-scripts

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && mkdir -p data && chown node:node data
COPY --from=build --chown=node:node /app/package.json /app/next.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/lib/db/migrations ./lib/db/migrations
USER node
VOLUME /app/data
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]

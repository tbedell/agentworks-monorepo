# Dev Environment Manager Service Dockerfile

FROM node:18-alpine AS base
RUN apk add --no-cache curl
RUN npm install -g pnpm@9.14.2
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dev-env-manager/package.json ./apps/dev-env-manager/
COPY packages/*/package.json ./packages/*/

FROM base AS development
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @agentworks/db generate
RUN pnpm build:packages
WORKDIR /app/apps/dev-env-manager
EXPOSE 8006
ENV PORT 8006
ENV NODE_ENV development
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8006/health || exit 1
CMD ["pnpm", "dev"]

FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @agentworks/db generate
RUN pnpm build:packages
WORKDIR /app/apps/dev-env-manager
RUN pnpm build

FROM node:18-alpine AS production
RUN apk add --no-cache dumb-init curl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
WORKDIR /app
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/dev-env-manager/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --chown=nodejs:nodejs package.json pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs apps/dev-env-manager/package.json ./apps/dev-env-manager/
RUN npm install -g pnpm@9.14.2
USER nodejs
EXPOSE 8006
ENV PORT 8006
ENV NODE_ENV production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8006/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

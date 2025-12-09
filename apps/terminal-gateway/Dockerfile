# Terminal Gateway Service Dockerfile
# Uses node-pty which requires native compilation

FROM node:18-alpine AS base
# node-pty requires build tools for native compilation
RUN apk add --no-cache curl python3 make g++ linux-headers
RUN npm install -g pnpm@9.14.2
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/terminal-gateway/package.json ./apps/terminal-gateway/
COPY packages/*/package.json ./packages/*/

FROM base AS development
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @agentworks/db generate
RUN pnpm build:packages
WORKDIR /app/apps/terminal-gateway
EXPOSE 8005
ENV PORT 8005
ENV NODE_ENV development
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8005/health || exit 1
CMD ["pnpm", "dev"]

FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @agentworks/db generate
RUN pnpm build:packages
WORKDIR /app/apps/terminal-gateway
RUN pnpm build

FROM node:18-alpine AS production
# node-pty requires build tools in production too for native modules
RUN apk add --no-cache dumb-init curl python3 make g++ linux-headers
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
WORKDIR /app
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/terminal-gateway/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --chown=nodejs:nodejs package.json pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs apps/terminal-gateway/package.json ./apps/terminal-gateway/
RUN npm install -g pnpm@9.14.2
USER nodejs
EXPOSE 8005
ENV PORT 8005
ENV NODE_ENV production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8005/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

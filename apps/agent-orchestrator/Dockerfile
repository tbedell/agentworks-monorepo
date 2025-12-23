# Agent Orchestrator Dockerfile

FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl python3 make g++
RUN npm install -g pnpm@9.14.2

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/agent-orchestrator/package.json ./apps/agent-orchestrator/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/providers/package.json ./packages/providers/
COPY packages/queue/package.json ./packages/queue/
COPY packages/storage/package.json ./packages/storage/
COPY packages/agents/package.json ./packages/agents/
COPY packages/agent-tools/package.json ./packages/agent-tools/
COPY packages/ai-gateway/package.json ./packages/ai-gateway/
COPY packages/git-service/package.json ./packages/git-service/
COPY packages/project-files/package.json ./packages/project-files/
COPY packages/style-guide/package.json ./packages/style-guide/
COPY packages/context-service/package.json ./packages/context-service/

# Development stage
FROM base AS development

RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @agentworks/db generate

WORKDIR /app/apps/agent-orchestrator

EXPOSE 8001
ENV PORT 8001
ENV NODE_ENV development

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["pnpm", "dev"]

# Build stage
FROM base AS builder

RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @agentworks/db generate

WORKDIR /app
RUN pnpm turbo build --filter=@agentworks/agent-orchestrator...

# Production stage
FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init curl python3 make g++
RUN npm install -g pnpm@9.14.2

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nodejs:nodejs /app/apps/agent-orchestrator/package.json ./apps/agent-orchestrator/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @agentworks/db generate
RUN pnpm prune --prod

COPY --from=builder --chown=nodejs:nodejs /app/apps/agent-orchestrator/dist ./apps/agent-orchestrator/dist

WORKDIR /app/apps/agent-orchestrator

USER nodejs

EXPOSE 8001
ENV PORT 8001
ENV NODE_ENV production

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

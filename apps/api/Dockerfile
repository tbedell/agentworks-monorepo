# API Gateway (Fastify) Dockerfile

FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl python3 make g++
RUN npm install -g pnpm@9.14.2

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
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

# Development stage
FROM base AS development

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm --filter @agentworks/db generate

WORKDIR /app/apps/api

EXPOSE 8080

ENV PORT 8080
ENV NODE_ENV development

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["pnpm", "dev"]

# Build stage
FROM base AS builder

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm --filter @agentworks/db generate

# Build all workspace packages that the API depends on using turbo
WORKDIR /app
RUN pnpm turbo build --filter=@agentworks/api...

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache dumb-init curl python3 make g++
RUN npm install -g pnpm@9.14.2

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

WORKDIR /app

# Copy full workspace structure for pnpm to resolve dependencies
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

# Install all dependencies (need prisma for generate)
RUN pnpm install --frozen-lockfile

# Generate Prisma client in production
RUN pnpm --filter @agentworks/db generate

# Prune dev dependencies
RUN pnpm prune --prod

# Copy built API application
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist

# Set working directory to API
WORKDIR /app/apps/api

USER nodejs

EXPOSE 8080

ENV PORT 8080
ENV NODE_ENV production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
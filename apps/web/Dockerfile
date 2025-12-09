# Frontend (Next.js) Dockerfile

FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat curl
RUN npm install -g pnpm@9.14.2

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/

# Development stage
FROM base AS development

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm --filter @agentworks/db generate

WORKDIR /app/apps/web

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Enable hot reload for development
CMD ["pnpm", "dev"]

# Production dependencies
FROM base AS prod-deps

RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM base AS builder

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm --filter @agentworks/db generate

# Build packages first
RUN pnpm build:packages

# Build the Next.js application
WORKDIR /app/apps/web
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache dumb-init curl

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/apps/web/node_modules ./apps/web/node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./apps/web/

# Copy shared packages
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

# Copy configuration files
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.js ./apps/web/
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-workspace.yaml ./

# Install pnpm
RUN npm install -g pnpm@9.14.2

USER nextjs

WORKDIR /app/apps/web

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "start"]
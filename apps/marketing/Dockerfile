# Marketing Site (Vite React) Dockerfile

FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat curl
RUN npm install -g pnpm@9.14.2

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/marketing/package.json ./apps/marketing/
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

WORKDIR /app/apps/marketing

EXPOSE 5175

ENV PORT 5175
ENV HOST "0.0.0.0"

# Enable hot reload for development
CMD ["pnpm", "dev", "--host"]

# Production dependencies
FROM base AS prod-deps

RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM base AS builder

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build shared packages first
RUN pnpm --filter @agentworks/shared build || true

# Build the Vite application
WORKDIR /app/apps/marketing

# Set build-time environment variables
ARG VITE_API_URL=https://api.agentworksstudio.com
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# Production stage - use nginx to serve static files
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx config
COPY apps/marketing/nginx.conf /etc/nginx/nginx.conf

# Copy built static files from builder
COPY --from=builder /app/apps/marketing/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

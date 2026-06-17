# syntax=docker/dockerfile:1

# ---------- Stage 1: Dependencies ----------
FROM oven/bun:1.1.42-slim AS deps

WORKDIR /app

# Install curl for health checks in the runner stage
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN bun install --no-cache

# ---------- Stage 2: Builder ----------
FROM oven/bun:1.1.42-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application
RUN bun run build

# ---------- Stage 3: Runner ----------
FROM oven/bun:1.1.42-slim AS runner

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public files if they exist
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["bun", "server.js"]

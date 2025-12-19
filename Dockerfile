# ==========================================
# CrowdBeat Production Dockerfile
# Multi-stage build for optimized image size
# ==========================================

# ==================== Build Stage: Client ====================
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Install dependencies first (better layer caching)
COPY client/package*.json ./
RUN npm ci --only=production=false

# Copy source and build
COPY client/ ./
RUN npm run build

# ==================== Build Stage: Server ====================
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Install dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy source
COPY server/ ./

# ==================== Production Stage ====================
FROM node:20-alpine AS production

# Add labels
LABEL maintainer="CrowdBeat Team"
LABEL version="1.0.0"
LABEL description="CrowdBeat - Crowd-sourced music creation platform"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built client
COPY --from=client-builder --chown=nodejs:nodejs /app/client/dist ./client/dist

# Copy server
COPY --from=server-builder --chown=nodejs:nodejs /app/server ./server

# Create uploads directory
RUN mkdir -p /app/uploads && chown nodejs:nodejs /app/uploads

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Set working directory to server
WORKDIR /app/server

# Start with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]


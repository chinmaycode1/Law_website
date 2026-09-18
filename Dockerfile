# ============================================================================
# MULTI-STAGE DOCKERFILE FOR LAW WEBSITE BACKEND
# ============================================================================
# Stage 1: Build dependencies
# Stage 2: Production runtime
#
# Target platform: Render.com
# Base image: node:20-alpine (LTS, minimal footprint)
# Security: Non-root user, minimal attack surface
# ============================================================================

# ────────────────────────────────────────────────────────────────────────────
# STAGE 1: DEPENDENCIES
# ────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
# --omit=dev skips devDependencies (nodemon, etc.)
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ────────────────────────────────────────────────────────────────────────────
# STAGE 2: PRODUCTION RUNTIME
# ────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Create non-root user for security
# -S: system user, -D: no password, -H: no home directory
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Copy dependencies from builder stage
COPY --from=builder --chown=appuser:appgroup /build/node_modules ./node_modules

# Copy backend application code
COPY --chown=appuser:appgroup backend/ ./

# Ensure the user owns the app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port (Render injects PORT env var, defaulting to 3000)
# This is declarative only - Render will override with its own PORT
EXPOSE 3000

# Health check: verify server responds on /api/health
# Runs every 30s, timeout 10s, 3 retries before marking unhealthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the server
# Render provides PORT env var; server.js reads process.env.PORT || 3000
CMD ["node", "server.js"]

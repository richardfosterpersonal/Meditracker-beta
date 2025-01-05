# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --legacy-peer-deps
RUN cd frontend && npm ci --legacy-peer-deps
RUN cd backend && npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build frontend with production optimization
RUN cd frontend && \
    GENERATE_SOURCEMAP=false \
    npm run build

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:18-alpine

# Install PostgreSQL client and security updates
RUN apk add --no-cache \
    postgresql-client \
    && apk upgrade --no-cache

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy built artifacts
COPY --from=builder --chown=appuser:appgroup /app/backend/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/backend/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/frontend/build ./public
COPY --from=builder --chown=appuser:appgroup /app/backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy configuration files
COPY --chown=appuser:appgroup .env.production .env
COPY --chown=appuser:appgroup backend/migrations ./migrations

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start application
CMD ["node", "dist/server.js"]

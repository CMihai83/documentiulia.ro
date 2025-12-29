# DocumentIulia.ro Backend - Production Dockerfile
# Multi-stage build for NestJS with Prisma

# ============= Build Stage =============
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for bcrypt native module
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============= Production Stage =============
FROM node:20-slim AS production

# Install dependencies for Prisma and OpenSSL
RUN apt-get update && apt-get install -y openssl ca-certificates wget && rm -rf /var/lib/apt/lists/*

# Security: create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash nestjs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && \
    npm cache clean --force

# Copy Prisma schema and generate client
COPY --from=builder /app/prisma ./prisma/
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create log directory with proper permissions
RUN mkdir -p /var/log/documentiulia && chown -R nestjs:nodejs /var/log/documentiulia

# Set proper ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/main"]

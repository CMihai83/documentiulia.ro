# DocumentIulia.ro Backend - Production Dockerfile
# Multi-stage build for NestJS with Prisma

# ============= Build Stage =============
FROM node:20-slim AS builder

WORKDIR /app

# Build deps for native modules: bcrypt + canvas (chartjs-node-canvas → business-case charts)
RUN apt-get update && apt-get install -y \
      python3 make g++ \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============= Production Stage =============
FROM node:20-slim AS production

# Runtime deps: Prisma/OpenSSL + canvas shared libraries (Cairo/Pango/JPEG/GIF/SVG)
# + Chromium shared libraries for Puppeteer (BC-305 real PDF rendering);
# fonts-liberation for consistent text metrics in printed PDFs.
RUN apt-get update && apt-get install -y \
      openssl ca-certificates wget \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
      libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 libdrm2 \
      libexpat1 libgbm1 libglib2.0-0 libx11-6 libxcb1 libxcomposite1 libxdamage1 \
      libxext6 libxfixes3 libxkbcommon0 libxrandr2 libasound2 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Security: create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash nestjs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Puppeteer downloads Chrome during npm ci; keep it inside /app so the
# non-root user can execute it (BC-305).
ENV PUPPETEER_CACHE_DIR=/app/.puppeteer-cache

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy Prisma schema and generate client
COPY --from=builder /app/prisma ./prisma/
RUN npx prisma generate

# Copy built application + committed assets (BC-302 workbook template)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets

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

# Playwright requires special base image
FROM mcr.microsoft.com/playwright:v1.44.0-jammy AS builder
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY workers/package.json ./workers/
COPY packages ./packages

# Install pnpm
RUN npm install -g pnpm@8

# Install dependencies (including Playwright)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY workers ./workers
COPY tsconfig.json ./

# Build
WORKDIR /app/workers
RUN pnpm build

# Production stage (keep Playwright browsers)
FROM mcr.microsoft.com/playwright:v1.44.0-jammy
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy built artifacts
COPY --from=builder /app/workers/dist ./dist
COPY --from=builder /app/workers/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages ./packages

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Playwright needs more memory
ENV NODE_OPTIONS="--max-old-space-size=2048"

EXPOSE 8080

CMD ["node", "dist/index.js"]

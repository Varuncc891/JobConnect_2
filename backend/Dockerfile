# STAGE 1: BUILDER
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy source code
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# STAGE 2: PRODUCTION
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 4000

CMD ["node", "dist/server.js"]
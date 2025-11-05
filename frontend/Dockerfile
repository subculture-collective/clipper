# Multi-stage Dockerfile for React frontend

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Enable Corepack for Yarn
RUN corepack enable

# Copy package files (including yarn.lock and .yarnrc.yml)
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies
RUN yarn install --immutable

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health.html || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]

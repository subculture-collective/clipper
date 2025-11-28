# Multi-stage Dockerfile for React frontend

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code and environment file
COPY . .

# Use production environment for build
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Remove dev .env file so .env.production is used
RUN rm -f .env .env.local

# Build the application (Vite will use .env.production automatically)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Install curl for healthcheck
RUN apk add --no-cache curl

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost/health.html || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]

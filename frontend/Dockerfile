# Multi-stage Dockerfile for React frontend with Vault integration

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Use production environment for build
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build argument for Vault-rendered env file path (used in Docker Compose)
ARG VAULT_ENV_FILE=/vault/secrets/frontend.env

# Remove dev .env files
RUN rm -f .env .env.local

# Copy Vault-rendered .env.production if it exists (for local testing)
# In production, this is mounted from Vault agent volume
RUN if [ -f "${VAULT_ENV_FILE}" ]; then \
      cp "${VAULT_ENV_FILE}" .env.production; \
    elif [ -f .env.production.example ]; then \
      echo "WARNING: Using .env.production.example as fallback"; \
      cp .env.production.example .env.production; \
    else \
      echo "ERROR: No environment file found"; \
      exit 1; \
    fi

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

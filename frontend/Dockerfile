# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------------------------
# Frontend image. The build context is the REPOSITORY ROOT (so docker/nginx.conf can be copied):
#   docker build -f frontend/Dockerfile .
#   deps    - installs node_modules (cached until package*.json changes)
#   build   - type-checks and builds the static bundle
#   runtime - unprivileged nginx serving the bundle and proxying /api to the backend
# ---------------------------------------------------------------------------------------------
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY frontend/ ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

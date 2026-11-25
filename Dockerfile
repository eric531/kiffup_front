# KiffUp front — production image: the Vue site built once, served by Caddy.
# Built by event-stay/docker-compose.prod.yml, which also mounts the Caddy configuration
# (event-stay/docker/production/caddy).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Public values only (they end up in the JavaScript): never a secret here.
ARG VITE_API_URL
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
# Empty: same address as the site (test by IP address, before the domain).
ARG VITE_REVERB_PORT
ENV VITE_DEVTOOLS=false
RUN npm run build

FROM caddy:2.10-alpine
COPY --from=build /app/dist /srv/front

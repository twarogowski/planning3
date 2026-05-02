# syntax=docker/dockerfile:1

# Etap 1: build z bun (skrypt prepare:wasm kopiuje WASM MediaPipe do public/)
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Etap 2: serwer statyczny
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# nginx-web.conf jest dostarczany z aws-infra przez volume w docker-compose.

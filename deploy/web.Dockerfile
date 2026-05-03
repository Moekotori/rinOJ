# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/rin-ui/package.json packages/rin-ui/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY apps/web apps/web
COPY packages/rin-ui packages/rin-ui
RUN pnpm --filter @rin-oj/web build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S rin && adduser -S rin -G rin

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER rin
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

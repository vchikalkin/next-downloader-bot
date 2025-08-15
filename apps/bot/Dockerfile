ARG NODE_VERSION=22
ARG PROJECT=bot

# Alpine image
FROM node:${NODE_VERSION}-alpine AS alpine
RUN apk update
RUN apk add --no-cache libc6-compat

FROM alpine as base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    pnpm install turbo dotenv-cli --global

FROM base AS pruner
ARG PROJECT
WORKDIR /app
COPY . .
RUN turbo prune --scope=${PROJECT} --docker

FROM base AS builder
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm install --prod --frozen-lockfile

COPY --from=pruner /app/out/full/ .

COPY turbo.json turbo.json
COPY .env .env

RUN dotenv -e .env turbo run build --filter=${PROJECT}...
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store pnpm prune --prod --no-optional
RUN rm -rf ./**/*/src

FROM alpine AS runner
ARG PROJECT

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 botuser
USER botuser

WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app .
WORKDIR /app/apps/${PROJECT}

CMD ["node", "dist/index.cjs"]

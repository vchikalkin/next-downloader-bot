ARG NODE_VERSION=22
ARG PROJECT=bot

# Alpine image
FROM node:${NODE_VERSION}-alpine AS alpine
RUN apk update
RUN apk add --no-cache libc6-compat

FROM alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN mkdir -p /pnpm/bin && \
    apk add --no-cache libc6-compat && \
    corepack enable && \
    pnpm install turbo dotenv-cli --global

FROM base AS pruner
ARG PROJECT
WORKDIR /app
COPY . .
RUN turbo prune --scope=${PROJECT} --docker

FROM base AS builder
WORKDIR /app

# Install build dependencies for native modules (canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

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

# Install runtime deps; yt-dlp from GitHub (Alpine package is often too old for YouTube)
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    ca-certificates \
    ffmpeg \
    python3 \
    curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && apk del curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 botuser
USER botuser

WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app .
WORKDIR /app/apps/${PROJECT}

CMD ["node", "dist/index.cjs"]

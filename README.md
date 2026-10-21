# Next Downloader Bot

<p align="center">
  <a href="https://t.me/next_downloader_bot"><img src="https://img.shields.io/badge/Telegram-@next__downloader__bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Open in Telegram" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/grammY-009dca?style=flat-square&logo=telegram&logoColor=white" alt="grammY" />
  <img src="https://img.shields.io/badge/pnpm-9.15.9-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
  <a href="https://github.com/vchikalkin/next-downloader-bot"><img src="https://img.shields.io/github/stars/vchikalkin/next-downloader-bot?style=flat-square" alt="GitHub stars" /></a>
</p>

Telegram bot that downloads **TikTok**, **Instagram**, and **YouTube** (including Shorts) media and sends it back in chat. You can add it to a group. TikTok and Instagram come without watermarks when the source allows it. Captions are kept where available.

**Live bot:** [t.me/next_downloader_bot](https://t.me/next_downloader_bot). Paste a link, get the file.

## What it supports

| Platform | Media | Notes |
|----------|--------|--------|
| TikTok | Video, photo posts | Short links (`vt` / `vm`) and full URLs |
| Instagram | Reels, posts, IGTV, stories URLs | Video or image carousels |
| YouTube | Videos and Shorts | Via [yt-dlp](https://github.com/yt-dlp/yt-dlp), up to **180 seconds** |

Also built in: Redis cache for repeat URLs, rate limiting, English / Russian i18n, optional Sentry, Docker Compose (bot + Redis + local Telegram Bot API).

## Try it

1. Open [@next_downloader_bot](https://t.me/next_downloader_bot)
2. Paste a URL, for example:
   - `https://vt.tiktok.com/...`
   - `https://www.instagram.com/reel/...` or `/p/...`
   - `https://www.youtube.com/watch?v=...` or `/shorts/...`
3. Get the media (and caption when the extractor finds one)

### Groups

Add the bot to a group. It downloads supported links from messages it receives. To receive every group message (not only @mentions and replies to the bot), disable Group Privacy in [@BotFather](https://t.me/BotFather) or promote the bot to admin.

Support: [@vchikalkin](https://t.me/vchikalkin)

## Stack

- [TypeScript](https://www.typescriptlang.org/) monorepo ([Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/))
- [grammY](https://grammy.dev/) Telegram bot framework
- [Redis](https://redis.io/) / [ioredis](https://github.com/redis/ioredis) for rate limits and media cache
- [Zod](https://zod.dev/) for env validation
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg for YouTube
- [Pino](https://getpino.io/) logging, optional [Sentry](https://sentry.io/)

## Prerequisites

- Node.js >= 18
- pnpm 9.15.9 (see `packageManager` in root `package.json`)
- Redis
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- For YouTube outside Docker: `yt-dlp` on `PATH` (or set `YTDLP_PATH`)

## Install and run

```bash
git clone https://github.com/vchikalkin/next-downloader-bot.git
cd next-downloader-bot
pnpm install
```

Create `.env` in the repo root (dev script also loads `.env.local`):

```env
BOT_TOKEN=
TELEGRAM_API_ROOT=https://api.telegram.org
DONATE_LINK=https://example.com

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Optional
RATE_LIMIT=2
RATE_LIMIT_TIME=3000
SENTRY_DSN=
YTDLP_PATH=
```

```bash
pnpm dev      # apps/bot with tsx watch
pnpm build
pnpm start
```

Other scripts: `pnpm lint`, `pnpm format`.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | yes | | Token from @BotFather |
| `TELEGRAM_API_ROOT` | yes | | API base URL (`https://api.telegram.org` or local Bot API) |
| `DONATE_LINK` | yes | | Shown in bot description / donate text |
| `REDIS_PASSWORD` | yes | | Redis password |
| `REDIS_HOST` | no | `redis` | Redis host |
| `REDIS_PORT` | no | `6379` | Redis port |
| `RATE_LIMIT` | no | `2` | Max requests per timeframe (per user) |
| `RATE_LIMIT_TIME` | no | `3000` | Rate-limit window in ms |
| `SENTRY_DSN` | no | | Sentry DSN |
| `YTDLP_PATH` | no | | Path to `yt-dlp` binary if not on `PATH` |

For Compose with [aiogram/telegram-bot-api](https://hub.docker.com/r/aiogram/telegram-bot-api), also set `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from [my.telegram.org](https://my.telegram.org).

## Docker

Local / self-host stack (builds the bot image):

```bash
# .env as above, plus TELEGRAM_API_ID / TELEGRAM_API_HASH for the Bot API container
docker compose -f docker-compose.dev.yml up -d
```

Production compose (`docker-compose.yml`) pulls `${DOCKERHUB_USERNAME}/next-downloader-bot:${BOT_IMAGE_TAG}` and runs Redis + bot + Telegram Bot API. CI on `master` builds, pushes to Docker Hub, and deploys via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Project layout

```
apps/bot/                 Telegram bot (grammY)
  src/bot/features/       welcome, download, unhandled
  src/utils/              tiktok, instagram, youtube / yt-dlp, redis, extract
  locales/                en.ftl, ru.ftl
packages/                 shared eslint / typescript / lint-staged configs
docker-compose.yml        production stack
docker-compose.dev.yml    local build + ports for Redis / Bot API
```

Download flow: validate URL → platform detect → Redis cache hit or fetch → send media → cache message ids for the next request with the same URL.

## Internationalization

Fluent files live in `apps/bot/locales/`:

- `en.ftl` — English
- `ru.ftl` — Russian

To add a language: new `.ftl`, wire it in `apps/bot/src/bot/i18n.ts`, and set bot name / descriptions through the settings helpers if you need them on Telegram’s side.

## Contributing

1. Fork and branch from `master`
2. Keep changes focused; match existing TypeScript and lint setup
3. Open a PR against [vchikalkin/next-downloader-bot](https://github.com/vchikalkin/next-downloader-bot)

Issues: [github.com/vchikalkin/next-downloader-bot/issues](https://github.com/vchikalkin/next-downloader-bot/issues)

## Disclaimer

You are responsible for how you use downloaded media. Respect platform terms and copyright. Do not use this for content you are not allowed to copy or redistribute.

## Links

| | |
|--|--|
| Bot | [t.me/next_downloader_bot](https://t.me/next_downloader_bot) |
| Source | [github.com/vchikalkin/next-downloader-bot](https://github.com/vchikalkin/next-downloader-bot) |
| Support | [t.me/vchikalkin](https://t.me/vchikalkin) |
| grammY | [grammy.dev](https://grammy.dev/) |
| Telegram Bot API | [core.telegram.org/bots/api](https://core.telegram.org/bots/api) |
| yt-dlp | [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| Redis | [redis.io/docs](https://redis.io/docs/) |

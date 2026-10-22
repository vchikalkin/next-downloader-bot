# Next Downloader Bot

**Язык:** [English](README.md) | Русский

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

Telegram-бот для **TikTok**, **Instagram** и **YouTube** (включая Shorts). Кидаешь ссылку в личку, группу или группу с темами, бот присылает файл. TikTok и Instagram без водяных знаков, если источник это позволяет.

Бот: [t.me/next_downloader_bot](https://t.me/next_downloader_bot)

## Что поддерживает

| Платформа | Медиа | Заметки |
|-----------|--------|---------|
| TikTok | Видео, фотопосты | Короткие ссылки (`vt` / `vm`) и полные URL |
| Instagram | Reels, посты, IGTV, stories | Видео или карусели картинок |
| YouTube | Видео и Shorts | Через [yt-dlp](https://github.com/yt-dlp/yt-dlp), до **180 секунд** |

Повторные URL кэшируются в Redis. Есть rate limit, i18n (en / ru), опциональный Sentry и Docker Compose для бота, Redis и локального Telegram Bot API.

## Попробовать

1. Открой [@next_downloader_bot](https://t.me/next_downloader_bot)
2. Вставь URL, например:
   - `https://vt.tiktok.com/...`
   - `https://www.instagram.com/reel/...` или `/p/...`
   - `https://www.youtube.com/watch?v=...` или `/shorts/...`
3. Дождись медиа. В личке бот ещё присылает текст поста, если его удалось вытащить.

### Группы

Добавь бота в группу или в форум (темы). Правила те же.

Чтобы бот видел все ссылки, выключи Group Privacy в [@BotFather](https://t.me/BotFather) или сделай его админом. Иначе Telegram отдаёт только @упоминания и ответы на сообщения бота.

Если бот админ с правом **Удаление сообщений**, он удаляет исходную ссылку (и твоё сообщение с @упоминанием, если оно было) и шлёт медиа с подписью: `by @user from TikTok` / `Прислал @user из TikTok`. Так обычно и ставят бота в группах и топиках.

Без права удаления бот отвечает reply на ссылку и оставляет сообщение на месте. Подписи «Прислал…» на медиа нет, текст поста с платформы приходит только в личке.

Можно ответить на сообщение со ссылкой и @упомянуть бота: он скачает эту ссылку.

Поддержка: [@vchikalkin](https://t.me/vchikalkin)

## Стек

- [TypeScript](https://www.typescriptlang.org/) monorepo ([Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/))
- [grammY](https://grammy.dev/) — фреймворк Telegram-бота
- [Redis](https://redis.io/) / [ioredis](https://github.com/redis/ioredis) — rate limit и кэш медиа
- [Zod](https://zod.dev/) — валидация env
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) + ffmpeg для YouTube
- [Pino](https://getpino.io/) — логи, опционально [Sentry](https://sentry.io/)

## Требования

- Node.js >= 18
- pnpm 9.15.9 (см. `packageManager` в корневом `package.json`)
- Redis
- Токен бота из [@BotFather](https://t.me/BotFather)
- Для YouTube вне Docker: `yt-dlp` в `PATH` (или задай `YTDLP_PATH`)

## Установка и запуск

```bash
git clone https://github.com/vchikalkin/next-downloader-bot.git
cd next-downloader-bot
pnpm install
```

Создай `.env` в корне репозитория (dev-скрипт также читает `.env.local`):

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
pnpm dev      # apps/bot с tsx watch
pnpm build
pnpm start
```

Другие скрипты: `pnpm lint`, `pnpm format`.

## Переменные окружения

| Переменная | Обязательно | По умолчанию | Описание |
|------------|-------------|--------------|----------|
| `BOT_TOKEN` | да | | Токен от @BotFather |
| `TELEGRAM_API_ROOT` | да | | Базовый URL API (`https://api.telegram.org` или локальный Bot API) |
| `DONATE_LINK` | да | | Ссылка в описании бота / тексте доната |
| `REDIS_PASSWORD` | да | | Пароль Redis |
| `REDIS_HOST` | нет | `redis` | Хост Redis |
| `REDIS_PORT` | нет | `6379` | Порт Redis |
| `RATE_LIMIT` | нет | `2` | Макс. запросов за окно (на пользователя) |
| `RATE_LIMIT_TIME` | нет | `3000` | Окно rate limit в мс |
| `SENTRY_DSN` | нет | | Sentry DSN |
| `YTDLP_PATH` | нет | | Путь к `yt-dlp`, если его нет в `PATH` |

Для Compose с [aiogram/telegram-bot-api](https://hub.docker.com/r/aiogram/telegram-bot-api) ещё задай `TELEGRAM_API_ID` и `TELEGRAM_API_HASH` с [my.telegram.org](https://my.telegram.org).

## Docker

Локальный / self-host стек (собирает образ бота):

```bash
# .env как выше, плюс TELEGRAM_API_ID / TELEGRAM_API_HASH для контейнера Bot API
docker compose -f docker-compose.dev.yml up -d
```

Продакшен-compose (`docker-compose.yml`) тянет `${DOCKERHUB_USERNAME}/next-downloader-bot:${BOT_IMAGE_TAG}` и поднимает Redis, бота и Telegram Bot API. CI на `master` собирает образ, пушит в Docker Hub и деплоит через [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Структура проекта

```
apps/bot/                 Telegram-бот (grammY)
  src/bot/features/       welcome, download, unhandled
  src/utils/              tiktok, instagram, youtube / yt-dlp, redis, extract
  locales/                en.ftl, ru.ftl
packages/                 общие конфиги eslint / typescript / lint-staged
docker-compose.yml        продакшен-стек
docker-compose.dev.yml    локальная сборка + порты Redis / Bot API
```

Скачивание: проверка URL → платформа → Redis-кэш или загрузка → отправка медиа → кэш file id для следующего такого же URL.

## Локализация

Fluent-файлы в `apps/bot/locales/`:

- `en.ftl` — английский
- `ru.ftl` — русский

Новый язык: добавь `.ftl`, подключи в `apps/bot/src/bot/i18n.ts`. Имя и описания бота в Telegram при необходимости обновляются через settings-хелперы.

## Участие

1. Форкни репозиторий и сделай ветку от `master`
2. Держи diff небольшим и следуй текущему TypeScript и lint
3. Открой PR в [vchikalkin/next-downloader-bot](https://github.com/vchikalkin/next-downloader-bot)

Issues: [github.com/vchikalkin/next-downloader-bot/issues](https://github.com/vchikalkin/next-downloader-bot/issues)

## Отказ от ответственности

Ты сам отвечаешь за то, как используешь скачанное медиа. Соблюдай правила платформ и авторские права. Не качай и не распространяй то, на что у тебя нет прав.

## Ссылки

| | |
|--|--|
| Бот | [t.me/next_downloader_bot](https://t.me/next_downloader_bot) |
| Исходники | [github.com/vchikalkin/next-downloader-bot](https://github.com/vchikalkin/next-downloader-bot) |
| Поддержка | [t.me/vchikalkin](https://t.me/vchikalkin) |
| grammY | [grammy.dev](https://grammy.dev/) |
| Telegram Bot API | [core.telegram.org/bots/api](https://core.telegram.org/bots/api) |
| yt-dlp | [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| Redis | [redis.io/docs](https://redis.io/docs/) |

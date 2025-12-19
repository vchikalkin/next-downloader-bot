# Next-Downloader-Bot

A Telegram bot for downloading TikTok and Instagram videos and images without watermarks. Built with TypeScript, Grammy.js, and Redis for caching.

## 🤖 Try the Bot

**The bot is already live and ready to use!** 

👉 **[Start Next Downloader Bot](https://t.me/next_downloader_bot)**

Simply send a TikTok or Instagram video or image URL to the bot and it will download the content without watermarks for you.

## 🚀 Features

- **TikTok Video Download**: Download TikTok videos without watermarks
- **Instagram Video Download**: Download Instagram Reels, posts, and IGTV videos without watermarks
- **Image/Photo Support**: Download TikTok and Instagram image collections
- **Caching**: Redis-based caching to avoid re-downloading the same content
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Internationalization**: Multi-language support (English, Russian)
- **Docker Support**: Easy deployment with Docker Compose
- **TypeScript**: Fully typed codebase for better development experience

## 📋 Prerequisites

- Node.js >= 18
- pnpm >= 9.15.9
- Redis server
- Telegram Bot Token

## 🛠️ Installation

> **Note**: This is an open-source project. You can either use the [live bot](https://t.me/next_downloader_bot) or deploy your own instance.

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/next-downloader-bot.git
cd next-downloader-bot
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_API_ROOT=https://api.telegram.org

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# Rate Limiting (optional, default: 5000ms)
RATE_LIMIT=5000
```

### 4. Development

```bash
# Start development mode
pnpm dev

# Build the project
pnpm build

# Start production mode
pnpm start
```

## 🐳 Docker Deployment

> **Quick Start**: Use the [live bot](https://t.me/next_downloader_bot) instead of deploying your own instance.

### Quick Start with Docker Compose

1. Create your `.env` file with the required environment variables
2. Run the application:

```bash
docker-compose up -d
```

This will start:
- Redis server with password protection
- Telegram Bot API server
- Next-Downloader-Bot application

### Development with Docker

For development, use the development compose file:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

## 📱 Usage

### Using the Live Bot

1. **[Start the bot](https://t.me/next_downloader_bot)** on Telegram
2. Send a TikTok or Instagram video or image URL
3. The bot will download and send you the content without watermarks

### Self-Hosting

If you want to run your own instance:

1. Start a conversation with your bot on Telegram
2. Send a TikTok or Instagram video or image URL
3. The bot will download and send you the content without watermarks

### Supported URL Formats

- Short TikTok URLs: `https://vt.tiktok.com/ZSHs35NpuL1nt-mE2tD`
- Instagram post URLs: `https://www.instagram.com/p/SHORTCODE/`

## 🏗️ Project Structure

```
Next-Downloader-Bot/
├── apps/
│   └── bot/                    # Main bot application
│       ├── src/
│       │   ├── bot/           # Bot logic and handlers
│       │   ├── config/        # Configuration files
│       │   ├── utils/         # Utility functions
│       │   └── index.ts       # Entry point
│       ├── locales/           # Internationalization files
│       └── package.json
├── packages/                   # Shared packages
│   ├── eslint-config/         # ESLint configuration
│   ├── typescript-config/     # TypeScript configuration
│   └── lint-staged-config/    # Lint-staged configuration
├── docker-compose.yml         # Production Docker setup
├── docker-compose.dev.yml     # Development Docker setup
└── package.json
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BOT_TOKEN` | Telegram bot token from @BotFather | ✅ | - |
| `TELEGRAM_API_ROOT` | Telegram API root URL | ✅ | - |
| `REDIS_HOST` | Redis server host | ❌ | `redis` |
| `REDIS_PORT` | Redis server port | ❌ | `6379` |
| `REDIS_PASSWORD` | Redis server password | ✅ | - |
| `RATE_LIMIT` | Rate limit in milliseconds | ❌ | `5000` |

### Redis Configuration

The bot uses Redis for caching downloaded videos to avoid re-downloading the same content. Make sure Redis is properly configured with:

- Password protection enabled
- Sufficient memory for caching
- Proper TTL settings

## 🧪 Development

### Available Scripts

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build the project
pnpm build

# Start production
pnpm start

# Lint code
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test:unit
pnpm test:e2e
```

### Code Quality

The project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Husky** for git hooks
- **Lint-staged** for pre-commit checks

## 🌐 Internationalization

The bot supports multiple languages. Language files are located in `apps/bot/locales/`:

- `en.ftl` - English
- `ru.ftl` - Russian

To add a new language:
1. Create a new `.ftl` file in the locales directory
2. Add the language to the bot configuration
3. Update the language detection logic

## 📊 Monitoring

The bot includes comprehensive logging using Pino:

- Request/response logging
- Error tracking
- Performance monitoring
- Rate limit tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature'`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This bot is for educational purposes only. Please respect TikTok's and Instagram's terms of service and copyright laws. Users are responsible for ensuring they have the right to download and use the content.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/next-downloader-bot/issues) page
2. Create a new issue with detailed information
3. Include logs and error messages

## 🔗 Links

- [Grammy.js Documentation](https://grammy.dev/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [TikTok API DL](https://github.com/tobyg74/tiktok-api-dl)
- [Redis Documentation](https://redis.io/documentation)
- [Instagram Platform Documentation](https://developers.facebook.com/docs/instagram)

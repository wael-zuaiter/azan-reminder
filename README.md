# Azan Reminder Bot

A Telegram bot that helps Muslims stay on track with their daily prayers by sending reminders for prayer times. The bot supports multiple languages (English and Arabic) and allows users to set custom reminders for any prayer.

## Features

- 🌍 Multi-language support (English and Arabic)
- 🕌 Accurate prayer times based on user's location
- ⏰ Customizable reminder times (5, 10, 15, 20, 25, 30 minutes before prayer)
- 📱 User-friendly interface with inline keyboards
- 🏙️ City-based prayer time calculation
- 🔔 Real-time prayer time notifications
- 📊 View all prayer times for your city
- 🗑️ Manage your reminders (delete all)

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- OpenStreetMap API access
- TimeZoneDB API key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/azan-reminder-bot.git
   cd azan-reminder-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   BOT_TOKEN=your_telegram_bot_token
   TIMEZONEDB_API_KEY=your_timezonedb_api_key
   DATABASE_URL=postgresql://username:password@localhost:5432/azan_reminder
   PORT=4008
   ```

4. Set up the database:
   ```bash
   npm run migrate
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Your Telegram bot token from @BotFather |
| `TIMEZONEDB_API_KEY` | API key for TimeZoneDB service |
| `DATABASE_URL` | PostgreSQL database connection URL |
| `PORT` | Port number for the web server (default: 4008) |

## Database Schema

The application uses the following tables:

### users
- `id` (SERIAL PRIMARY KEY)
- `telegram_id` (BIGINT UNIQUE)
- `city` (TEXT)
- `latitude` (FLOAT)
- `longitude` (FLOAT)
- `timezone` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### reminders
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER REFERENCES users(id))
- `prayer` (TEXT)
- `offset_minutes` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### sessions
- `telegram_id` (BIGINT PRIMARY KEY)
- `lang` (TEXT)
- `data` (JSONB)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Usage

1. Start a chat with your bot on Telegram
2. Select your preferred language (English or Arabic)
3. Enter your city name
4. Choose which prayers you want reminders for
5. Select how many minutes before the prayer you want to be reminded
6. You can view all prayer times, change your city, or delete all reminders at any time

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Telegraf.js](https://telegraf.js.org/) - Telegram bot framework
- [Adhan](https://github.com/batoulapps/adhan-js) - Prayer times calculation library
- [OpenStreetMap](https://www.openstreetmap.org/) - Location data
- [TimeZoneDB](https://timezonedb.com/) - Timezone information

## Support

If you find this project helpful, please consider giving it a ⭐️ on GitHub! 
module.exports = {
  apps: [{
    name: 'azan-reminder-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      BOT_TOKEN: process.env.BOT_TOKEN,
      TIMEZONEDB_API_KEY: process.env.TIMEZONEDB_API_KEY,
      PORT: 4008
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}; 
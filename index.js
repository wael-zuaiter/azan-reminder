import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup, session } from 'telegraf';
import knex from 'knex';
import knexConfig from './knexfile.js';
import logger from './logger.js';
import cron from 'node-cron';
import axios from 'axios';
import { PrayerTimes, CalculationMethod, Coordinates } from 'adhan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

// Get the directory name equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const MINUTE_OPTIONS = [5, 10, 15, 20, 25, 30];
const PORT = process.env.PORT || 4008;

// Initialize database and express
const db = knex(knexConfig.development);
const app = express();
app.use(express.json());
app.use(cookieParser());

// Basic auth middleware
const basicAuth = (req, res, next) => {
    // Check for auth cookie first
    if (req.cookies.dashboard_auth === 'true') {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (!process.env.DASHBOARD_USERNAME || !process.env.DASHBOARD_PASSWORD) {
        console.error('DASHBOARD_USERNAME and/or DASHBOARD_PASSWORD environment variables are not set');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error'
        });
    }

    if (username !== process.env.DASHBOARD_USERNAME || password !== process.env.DASHBOARD_PASSWORD) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }

    // Set auth cookie
    res.cookie('dashboard_auth', 'true', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return next();
};

// Serve static files from dashboard directory with authentication
app.use('/', express.static(path.join(__dirname, 'dashboard')));

// Serve dashboard HTML with authentication
app.get('/', basicAuth, (req, res) => {
    // Read and send the dashboard HTML file
    fs.readFile(path.join(__dirname, 'dashboard', 'index.html'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading dashboard file:', err);
            return res.status(500).send('Error loading dashboard');
        }
        res.send(data);
    });
});

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Language messages
const messages = {
  en: {
    welcome: 'Welcome! Please select your language:',
    cityPrompt: 'Please send your city name.',
    citySaved: 'City saved! Please select a prayer:',
    cityNotFound: 'City not found.',
    selectPrayer: 'Please select a prayer first:',
    selectMinutes: 'Please select how many minutes before the prayer:',
    enterOffset: 'Now please select how many minutes before the prayer for the reminder.',
    enterOffsetAll: 'Now please select how many minutes before the prayers for the reminder.',
    invalidOffset: 'Please select a valid number of minutes for the reminder.',
    reminderSet: '✅ Reminder for {prayer} set {offset} mins before Azan.',
    reminderSetAll: '✅ Reminders for ALL prayers set {offset} mins before Azan.',
    selectedPrayer: 'Selected {prayer}.',
    selectedAll: 'Selected ALL PRAYERS.',
    finish: '📋 Show All Reminders',
    currentReminders: 'Your current reminders:',
    noReminders: 'No reminders set yet.',
    changeCity: '🏙️ Change City',
    cityChanged: '✅ City changed successfully!',
    languageChanged: '✅ Language changed successfully!',
    deleteAll: '🗑️ Delete All',
    deleteAllConfirm: '⚠️ Are you sure you want to delete all reminders?',
    deleteAllSuccess: '✅ All reminders have been deleted successfully.',
    deleteAllCancelled: '❌ Operation cancelled.',
    showTimes: '🕒 Show Prayer Times',
    prayerTimes: '🕌 Prayer Times for {city}:\n\n',
    prayers: {
      fajr: '🌅 FAJR',
      sunrise: '🌞 SUNRISE',
      dhuhr: '☀️ DHUHR',
      asr: '🌤️ ASR',
      maghrib: '🌅 MAGHRIB',
      isha: '🌙 ISHA',
      all: '🕌 ALL PRAYERS'
    }
  },
  ar: {
    welcome: 'مرحباً! الرجاء اختيار اللغة:',
    cityPrompt: 'الرجاء إرسال اسم مدينتك.',
    citySaved: 'تم حفظ المدينة! الرجاء اختيار الصلاة:',
    cityNotFound: 'لم يتم العثور على المدينة.',
    selectPrayer: 'الرجاء اختيار الصلاة أولاً:',
    selectMinutes: 'الرجاء اختيار عدد الدقائق قبل الصلاة:',
    enterOffset: 'الآن الرجاء اختيار عدد الدقائق قبل الصلاة للتذكير.',
    enterOffsetAll: 'الآن الرجاء اختيار عدد الدقائق قبل الصلوات للتذكير.',
    invalidOffset: 'الرجاء اختيار عدد دقائق صحيح للتذكير.',
    reminderSet: '✅ تم تعيين تذكير لصلاة {prayer} قبل {offset} دقيقة من الأذان.',
    reminderSetAll: '✅ تم تعيين تذكير لجميع الصلوات قبل {offset} دقيقة من الأذان.',
    selectedPrayer: 'تم اختيار {prayer}.',
    selectedAll: 'تم اختيار جميع الصلوات.',
    finish: '📋 عرض جميع التذكيرات',
    currentReminders: 'تذكيرتك الحالية:',
    noReminders: 'لم يتم تعيين أي تذكيرات بعد.',
    changeCity: '🏙️ تغيير المدينة',
    cityChanged: '✅ تم تغيير المدينة بنجاح!',
    languageChanged: '✅ تم تغيير اللغة بنجاح!',
    deleteAll: '🗑️ حذف الكل',
    deleteAllConfirm: '⚠️ هل أنت متأكد أنك تريد حذف جميع التذكيرات؟',
    deleteAllSuccess: '✅ تم حذف جميع التذكيرات بنجاح.',
    deleteAllCancelled: '❌ تم إلغاء العملية.',
    showTimes: '🕒 عرض مواقيت الصلاة',
    prayerTimes: '🕌 مواقيت الصلاة في {city}:\n\n',
    prayers: {
      fajr: '🌅 الفجر',
      sunrise: '🌞 الشروق',
      dhuhr: '☀️ الظهر',
      asr: '🌤️ العصر',
      maghrib: '🌅 المغرب',
      isha: '🌙 العشاء',
      all: '🕌 جميع الصلوات'
    }
  }
};

// Helper functions
const formatTime = (date, lang) => {
  const options = { 
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  const timeStr = date.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', options);
  
  if (lang === 'ar') {
    const arabicNumerals = {
      '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
      '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
    };
    return timeStr.split('').map(char => arabicNumerals[char] || char).join('');
  }
  
  return timeStr;
};

const convertToArabicNumerals = (number) => {
  const arabicNumerals = {
    '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
    '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
  };
  return number.toString().split('').map(digit => arabicNumerals[digit]).join('');
};

const getPrayerEmoji = (prayer) => {
  const emojis = {
    fajr: '🌅',
    sunrise: '🌞',
    dhuhr: '☀️',
    asr: '🌤️',
    maghrib: '🌅',
    isha: '🌙'
  };
  return emojis[prayer] || '🕌';
};

// Session configuration
const sessionConfig = {
  store: {
    async get(key) {
      try {
        // Convert key to number if it's a string
        const telegramId = typeof key === 'string' ? parseInt(key.split(':')[0]) : key;
        const session = await db('sessions').where('telegram_id', telegramId).first();
        return session ? session.data : null;
      } catch (error) {
        logger.error('Error getting session:', error);
        return null;
      }
    },
    async set(key, value) {
      try {
        // Convert key to number if it's a string
        const telegramId = typeof key === 'string' ? parseInt(key.split(':')[0]) : key;
        await db('sessions')
          .insert({
            telegram_id: telegramId,
            data: value,
            updated_at: new Date()
          })
          .onConflict('telegram_id')
          .merge();
      } catch (error) {
        logger.error('Error setting session:', error);
      }
    },
    async delete(key) {
      try {
        // Convert key to number if it's a string
        const telegramId = typeof key === 'string' ? parseInt(key.split(':')[0]) : key;
        await db('sessions').where('telegram_id', telegramId).del();
      } catch (error) {
        logger.error('Error deleting session:', error);
      }
    }
  },
  defaultSession: () => ({
    lang: 'en',
    reminders: [],
    lastPrayer: null
  })
};

// Initialize session middleware
bot.use(session(sessionConfig));

// Keyboard creation functions
const createPrayerKeyboard = (lang) => Markup.inlineKeyboard([
  ...PRAYERS.map(prayer => [Markup.button.callback(messages[lang].prayers[prayer], `prayer_${prayer}`)]),
  [Markup.button.callback(messages[lang].prayers.all, 'prayer_all')],
  [
    Markup.button.callback('🌐 ' + (lang === 'en' ? 'العربية' : 'English'), 'change_lang'),
    Markup.button.callback(messages[lang].changeCity, 'change_city')
  ],
  [
    Markup.button.callback(messages[lang].finish, 'finish'),
    Markup.button.callback(messages[lang].deleteAll, 'delete_all')
  ],
  [Markup.button.callback(messages[lang].showTimes, 'show_times')]
]);

const createMinuteKeyboard = (lang) => Markup.inlineKeyboard([
  [
    Markup.button.callback('5 ' + (lang === 'en' ? 'minutes' : 'دقائق'), 'minutes_5'),
    Markup.button.callback('10 ' + (lang === 'en' ? 'minutes' : 'دقائق'), 'minutes_10')
  ],
  [
    Markup.button.callback('15 ' + (lang === 'en' ? 'minutes' : 'دقائق'), 'minutes_15'),
    Markup.button.callback('20 ' + (lang === 'en' ? 'minutes' : 'دقائق'), 'minutes_20')
  ],
  [
    Markup.button.callback('25 ' + (lang === 'en' ? 'minutes' : 'دقائق'), 'minutes_25'),
    Markup.button.callback('30 ' + (lang === 'en' ? 'minutes' : 'دقائق'), 'minutes_30')
  ]
]);

// Reminder formatting
const formatRemindersList = (reminders, lang) => {
  if (!reminders?.length) {
    return messages[lang].noReminders;
  }

  const header = lang === 'ar' 
    ? '🕌 *تذكيرتك الحالية:*\n\n'
    : '🕌 *Your Current Reminders:*\n\n';

  const reminderLines = reminders.map(reminder => {
    const prayerName = messages[lang].prayers[reminder.prayer];
    const emoji = getPrayerEmoji(reminder.prayer);
    const minutes = lang === 'ar' 
      ? convertToArabicNumerals(reminder.offset_minutes)
      : reminder.offset_minutes;
    
    return lang === 'ar'
      ? `⏰ ${emoji} ${prayerName}: *${minutes}* دقيقة قبل الأذان`
      : `⏰ ${emoji} ${prayerName}: *${minutes}* minutes before Azan`;
  }).join('\n\n');

  return header + reminderLines;
};

// Error handling middleware
const errorHandler = async (ctx, error, action = 'unknown') => {
  logger.error(`Error in ${action}:`, error);
  const lang = ctx.session?.lang || 'en';
  
  // Check if this is an expired callback query
  if (error.description?.includes('query is too old') || 
      error.description?.includes('query ID is invalid')) {
      // Silently ignore expired callback queries
      if (ctx.callbackQuery) {
          try {
              await ctx.answerCbQuery();
          } catch (e) {
              // Ignore any errors in answering the callback
          }
      }
      return;
  }
  
  await ctx.reply('An error occurred. Please try again.');
  if (ctx.callbackQuery) {
      try {
          await ctx.answerCbQuery();
      } catch (e) {
          // Ignore any errors in answering the callback
      }
  }
};

// Command handlers
bot.start(async (ctx) => {
  try {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('English 🇬🇧', 'lang_en')],
      [Markup.button.callback('العربية 🇸🇦', 'lang_ar')]
    ]);
    await ctx.reply(messages.en.welcome, keyboard);
  } catch (error) {
    await errorHandler(ctx, error, 'start');
  }
});

// Handle language selection
bot.action(/^lang_/, async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const lang = callbackData.split('_')[1];
    
    if (!lang || !messages[lang]) {
      console.error('Invalid language code:', lang);
      await ctx.reply('Invalid language selection. Please try again.');
      await ctx.answerCbQuery();
      return;
    }
    
    // Ensure session exists and is properly structured
    if (!ctx.session) {
      ctx.session = {
        lang: lang,
        reminders: [],
        lastPrayer: null
      };
    } else {
      ctx.session.lang = lang;
    }
    
    // Save session to database
    await db('sessions')
      .insert({
        telegram_id: ctx.from.id,
        data: ctx.session,
        updated_at: new Date()
      })
      .onConflict('telegram_id')
      .merge();
    
    await ctx.reply(messages[lang].cityPrompt);
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'language selection');
  }
});

// Handle language change
bot.action('change_lang', async (ctx) => {
  try {
    const currentLang = ctx.session?.lang || 'en';
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    
    // Ensure session exists and is properly structured
    if (!ctx.session) {
      ctx.session = {
        lang: newLang,
        reminders: [],
        lastPrayer: null
      };
    } else {
      ctx.session.lang = newLang;
    }
    
    // Save session to database
    await db('sessions')
      .insert({
        telegram_id: ctx.from.id,
        data: ctx.session,
        updated_at: new Date()
      })
      .onConflict('telegram_id')
      .merge();
    
    await ctx.reply(messages[newLang].languageChanged);
    await ctx.reply(messages[newLang].selectPrayer, createPrayerKeyboard(newLang));
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'language change');
  }
});

// Handle city change
bot.action('change_city', async (ctx) => {
  try {
    const lang = ctx.session?.lang || 'en';
    await ctx.reply(messages[lang].cityPrompt);
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'city change');
  }
});

// Handle city input
bot.on('text', async (ctx) => {
  try {
    const { text } = ctx.message;
    const message = text.trim();
    
    // Ensure session exists and is properly structured
    if (!ctx.session) {
      ctx.session = {
        lang: 'en',
        reminders: [],
        lastPrayer: null
      };
    }
    
    const lang = ctx.session.lang;
    console.log('Current session before text handling:', JSON.stringify(ctx.session, null, 2));
    
    // Check if this is a city input
    const user = await db('users').where({ telegram_id: ctx.from.id }).first();
    if (!user || ctx.session.lastPrayer === null) {
      // Get city details from OpenStreetMap
      const { data } = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${message}`);
      if (!data.length) return ctx.reply(messages[lang].cityNotFound);
      
      const { lat, lon, display_name } = data[0];
      
      // Get timezone from coordinates using TimeZoneDB API
      const timezoneResponse = await axios.get(`http://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lon}`);
      const timezone = timezoneResponse.data.zoneName;
      
      // Store the location data in session for confirmation
      ctx.session.pendingLocation = {
        city: message,
        latitude: lat,
        longitude: lon,
        timezone: timezone,
        display_name: display_name
      };

      // Send confirmation message with location details
      const confirmationMessage = lang === 'ar' 
        ? `هل هذا هو موقعك الصحيح؟\n\n${display_name}\n\nالرجاء تأكيد الموقع بالضغط على الزر أدناه.`
        : `Is this your correct location?\n\n${display_name}\n\nPlease confirm the location by clicking the button below.`;

      const confirmKeyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(lang === 'ar' ? '✅ نعم' : '✅ Yes', 'confirm_location'),
          Markup.button.callback(lang === 'ar' ? '❌ لا' : '❌ No', 'reject_location')
        ]
      ]);

      await ctx.reply(confirmationMessage, confirmKeyboard);
      return;
    }

    // If user exists and has selected a prayer, this should be the offset input
    if (ctx.session.lastPrayer) {
      const offset = parseInt(message);
      if (isNaN(offset)) {
        return ctx.reply(messages[lang].invalidOffset);
      }

      let newReminders = [];
      if (ctx.session.lastPrayer === 'all') {
        // Create reminders for all prayers
        newReminders = PRAYERS.map(prayer => ({
          user_id: user.id,
          prayer,
          offset_minutes: offset
        }));
        
        await db('reminders').insert(newReminders);
        console.log('Created all reminders:', newReminders);
      } else {
        // Create reminder for single prayer
        const reminder = { 
          user_id: user.id, 
          prayer: ctx.session.lastPrayer, 
          offset_minutes: offset 
        };
        await db('reminders').insert(reminder);
        newReminders = [reminder];
        console.log('Created single reminder:', reminder);
      }
      
      // Update session reminders
      if (!ctx.session.reminders) {
        ctx.session.reminders = [];
      }
      ctx.session.reminders = [...ctx.session.reminders, ...newReminders];
      console.log('Updated session reminders:', ctx.session.reminders);
      
      // Send appropriate response
      if (ctx.session.lastPrayer === 'all') {
        await ctx.reply(messages[lang].reminderSetAll.replace('{offset}', offset));
      } else {
        await ctx.reply(messages[lang].reminderSet
          .replace('{prayer}', messages[lang].prayers[ctx.session.lastPrayer])
          .replace('{offset}', offset));
      }
      
      ctx.session.lastPrayer = null;
      await ctx.reply(messages[lang].selectPrayer, createPrayerKeyboard(lang));
    } else {
      // If no prayer is selected, show the keyboard again
      await ctx.reply(messages[lang].selectPrayer, createPrayerKeyboard(lang));
    }
  } catch (error) {
    await errorHandler(ctx, error, 'text handler');
  }
});

// Handle location confirmation
bot.action('confirm_location', async (ctx) => {
  try {
    const lang = ctx.session?.lang || 'en';
    const pendingLocation = ctx.session?.pendingLocation;
    
    if (!pendingLocation) {
      await ctx.reply(messages[lang].cityPrompt);
      await ctx.answerCbQuery();
      return;
    }

    // Save the confirmed location
    await db('users')
      .insert({ 
        telegram_id: ctx.from.id, 
        city: pendingLocation.city, 
        latitude: pendingLocation.latitude, 
        longitude: pendingLocation.longitude,
        timezone: pendingLocation.timezone,
        full_name: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
        username: ctx.from.username || null
      })
      .onConflict('telegram_id')
      .merge();

    // Clear pending location from session
    delete ctx.session.pendingLocation;

    await ctx.reply(messages[lang].cityChanged);
    await ctx.reply(messages[lang].selectPrayer, createPrayerKeyboard(lang));
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'location confirmation');
  }
});

// Handle location rejection
bot.action('reject_location', async (ctx) => {
  try {
    const lang = ctx.session?.lang || 'en';
    
    // Clear pending location from session
    delete ctx.session.pendingLocation;

    await ctx.reply(messages[lang].cityPrompt);
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'location rejection');
  }
});

// Handle prayer selection from keyboard
bot.action(/^prayer_/, async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const prayer = callbackData.split('_')[1];
    const lang = ctx.session?.lang || 'en';
    
    console.log('Selected prayer:', prayer);
    
    // Ensure session exists
    if (!ctx.session) {
      ctx.session = {
        lang: lang,
        reminders: [],
        lastPrayer: null
      };
    }
    
    // Set the selected prayer
    ctx.session.lastPrayer = prayer;
    console.log('Updated session after prayer selection:', ctx.session);
    
    if (prayer === 'all') {
      await ctx.reply(messages[lang].enterOffsetAll, createMinuteKeyboard(lang));
    } else {
      await ctx.reply(messages[lang].enterOffset, createMinuteKeyboard(lang));
    }
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'prayer selection');
  }
});

// Handle minute selection
bot.action(/^minutes_/, async (ctx) => {
  try {
    const callbackData = ctx.callbackQuery.data;
    const minutes = parseInt(callbackData.split('_')[1]);
    const lang = ctx.session?.lang || 'en';
    const user = await db('users').where({ telegram_id: ctx.from.id }).first();
    
    if (!user || !ctx.session?.lastPrayer) {
      await ctx.reply(messages[lang].selectPrayer, createPrayerKeyboard(lang));
      await ctx.answerCbQuery();
      return;
    }

    let newReminders = [];
    if (ctx.session.lastPrayer === 'all') {
      // Delete existing reminders for all prayers
      await db('reminders').where('user_id', user.id).del();
      
      // Create new reminders for all prayers
      newReminders = PRAYERS.map(prayer => ({
        user_id: user.id,
        prayer,
        offset_minutes: minutes
      }));
      
      await db('reminders').insert(newReminders);
      console.log('Created all reminders:', newReminders);
    } else {
      // Delete existing reminder for this specific prayer
      await db('reminders')
        .where({
          user_id: user.id,
          prayer: ctx.session.lastPrayer
        })
        .del();
      
      // Create new reminder for single prayer
      const reminder = { 
        user_id: user.id, 
        prayer: ctx.session.lastPrayer, 
        offset_minutes: minutes 
      };
      await db('reminders').insert(reminder);
      newReminders = [reminder];
      console.log('Created single reminder:', reminder);
    }
    
    // Update session reminders
    ctx.session.reminders = await db('reminders')
      .where('user_id', user.id)
      .select('prayer', 'offset_minutes');
    
    console.log('Updated session reminders:', ctx.session.reminders);
    
    // Send appropriate response
    if (ctx.session.lastPrayer === 'all') {
      await ctx.reply(messages[lang].reminderSetAll.replace('{offset}', minutes));
    } else {
      await ctx.reply(messages[lang].reminderSet
        .replace('{prayer}', messages[lang].prayers[ctx.session.lastPrayer])
        .replace('{offset}', minutes));
    }
    
    ctx.session.lastPrayer = null;
    await ctx.reply(messages[lang].selectPrayer, createPrayerKeyboard(lang));
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'minute selection');
  }
});

// Handle finish button
bot.action('finish', async (ctx) => {
  try {
    const lang = ctx.session?.lang || 'en';
    const user = await db('users').where({ telegram_id: ctx.from.id }).first();
    
    if (!user) {
      await ctx.reply(messages[lang].cityPrompt);
      await ctx.answerCbQuery();
      return;
    }
    
    // Get fresh reminders from database
    const reminders = await db('reminders')
      .where('user_id', user.id)
      .select('prayer', 'offset_minutes');
    
    // Update session with fresh data
    if (ctx.session) {
      ctx.session.reminders = reminders;
    }
    
    await ctx.reply(formatRemindersList(reminders, lang), { parse_mode: 'Markdown' });
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'finish handler');
  }
});

// Handle delete all reminders
bot.action('delete_all', async (ctx) => {
  try {
    const lang = ctx.session?.lang || 'en';
    const user = await db('users').where({ telegram_id: ctx.from.id }).first();
    
    if (!user) {
      await ctx.reply(messages[lang].selectPrayer, createPrayerKeyboard(lang));
      await ctx.answerCbQuery();
      return;
    }

    // Delete all reminders from database
    await db('reminders').where('user_id', user.id).del();
    
    // Clear reminders from session
    if (ctx.session) {
      ctx.session.reminders = [];
    }

    await ctx.reply(messages[lang].deleteAllSuccess);
    await ctx.reply(messages[lang].selectPrayer, createPrayerKeyboard(lang));
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'delete all execution');
  }
});

// Handle show prayer times
bot.action('show_times', async (ctx) => {
  try {
    const lang = ctx.session?.lang || 'en';
    const user = await db('users').where({ telegram_id: ctx.from.id }).first();
    
    if (!user) {
      await ctx.reply(messages[lang].cityPrompt);
      await ctx.answerCbQuery();
      return;
    }

    const coords = new Coordinates(user.latitude, user.longitude);
    const now = new Date();
    
    // Get prayer times in UTC
    const times = new PrayerTimes(coords, now, CalculationMethod.MuslimWorldLeague());

    // Convert times to 12-hour format in user's timezone
    const formatTime = (date) => {
      // Convert UTC date to user's timezone
      const options = { 
        timeZone: user.timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      
      const timeStr = date.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', options);
      
      if (lang === 'ar') {
        // Convert Western numerals to Arabic numerals
        const arabicNumerals = {
          '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
          '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
        };
        return timeStr.split('').map(char => arabicNumerals[char] || char).join('');
      }
      
      return timeStr;
    };

    let message = messages[lang].prayerTimes.replace('{city}', user.city) + 
      PRAYERS.map(prayer => {
        const time = formatTime(times[prayer]);
        return `${messages[lang].prayers[prayer]}: ${time}`;
      }).join('\n');

    await ctx.reply(message);
    await ctx.answerCbQuery();
  } catch (error) {
    await errorHandler(ctx, error, 'showing prayer times');
  }
});

// Update the cron job to use timezone
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const users = await db('users');

  for (const user of users) {
    const coords = new Coordinates(user.latitude, user.longitude);
    const times = new PrayerTimes(coords, now, CalculationMethod.MuslimWorldLeague());

    const reminders = await db('reminders').where('user_id', user.id);
    const session = await db('sessions').where('telegram_id', user.telegram_id).first();
    const lang = session?.data?.lang || 'en';

    // Prayer names in both languages with emojis
    const prayerNames = {
      ar: {
        fajr: '🌅 الفجر',
        sunrise: '🌞 الشروق',
        dhuhr: '☀️ الظهر',
        asr: '🌤️ العصر',
        maghrib: '🌅 المغرب',
        isha: '🌙 العشاء'
      },
      en: {
        fajr: '🌅 FAJR',
        sunrise: '🌞 SUNRISE',
        dhuhr: '☀️ DHUHR',
        asr: '🌤️ ASR',
        maghrib: '🌅 MAGHRIB',
        isha: '🌙 ISHA'
      }
    };

    // Check for Azan times
    for (const prayer of PRAYERS) {
      const azanTime = times[prayer];
      const azanTimeInUserZone = new Date(azanTime.toLocaleString('en-US', { timeZone: user.timezone }));
      const nowInUserZone = new Date(now.toLocaleString('en-US', { timeZone: user.timezone }));
      
      if (azanTimeInUserZone.getHours() === nowInUserZone.getHours() && 
          azanTimeInUserZone.getMinutes() === nowInUserZone.getMinutes()) {
        if (lang === 'ar') {
          await bot.telegram.sendMessage(user.telegram_id, 
            `🕌 *حان الآن موعد آذان ${prayerNames.ar[prayer]}*\n\n` +
            `⏰ الوقت الآن: ${formatTime(azanTimeInUserZone, lang)}\n\n` +
            `📱 منبه الأذان`, 
            { parse_mode: 'Markdown' }
          );
        } else {
          await bot.telegram.sendMessage(user.telegram_id, 
            `🕌 *It's time for ${prayerNames.en[prayer]} Azan*\n\n` +
            `⏰ Current time: ${formatTime(azanTimeInUserZone, lang)}\n\n` +
            `📱 Azan Reminder`, 
            { parse_mode: 'Markdown' }
          );
        }
      }
    }

    // Check for reminders
    for (const reminder of reminders) {
      const azanTime = times[reminder.prayer];
      const notifyAt = new Date(azanTime.getTime() - reminder.offset_minutes * 60000);
      const notifyAtInUserZone = new Date(notifyAt.toLocaleString('en-US', { timeZone: user.timezone }));
      const nowInUserZone = new Date(now.toLocaleString('en-US', { timeZone: user.timezone }));
      
      if (notifyAtInUserZone.getHours() === nowInUserZone.getHours() && 
          notifyAtInUserZone.getMinutes() === nowInUserZone.getMinutes()) {
        if (lang === 'ar') {
          // Convert minutes to Arabic numerals
          const arabicNumerals = {
            '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
            '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
          };
          const minutesInArabic = reminder.offset_minutes.toString().split('').map(digit => arabicNumerals[digit]).join('');
          const message = 
            `🕌 *تذكير بموعد الصلاة*\n\n` +
            `⏰ باقي *${minutesInArabic}* دقائق على آذان ${prayerNames.ar[reminder.prayer]}\n\n` +
            `📱 منبه الأذان`;
          await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
        } else {
          const message = 
            `🕌 *Prayer Time Reminder*\n\n` +
            `⏰ *${reminder.offset_minutes}* minutes until ${prayerNames.en[reminder.prayer]} Azan\n\n` +
            `📱 Azan Reminder`;
          await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown' });
        }
      }
    }
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!process.env.DASHBOARD_USERNAME || !process.env.DASHBOARD_PASSWORD) {
        console.error('DASHBOARD_USERNAME and/or DASHBOARD_PASSWORD environment variables are not set');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error'
        });
    }
    
    if (username === process.env.DASHBOARD_USERNAME && password === process.env.DASHBOARD_PASSWORD) {
        res.cookie('dashboard_auth', 'true', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        res.json({ success: true });
    } else {
        res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    res.clearCookie('dashboard_auth');
    res.json({ success: true });
});

// Health check endpoint (public)
app.get('/health', async (_, res) => {
    try {
        await db.raw('SELECT 1');
        res.send('OK');
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).send('DB Error');
    }
});

// Protected API endpoints
app.get('/api/users', basicAuth, async (_, res) => {
    try {
        const users = await db('users').select('*');
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

app.get('/api/reminders', basicAuth, async (_, res) => {
    try {
        const reminders = await db('reminders')
            .join('users', 'reminders.user_id', 'users.id')
            .select(
                'reminders.*',
                'users.telegram_id',
                'users.city'
            );
        res.json({
            success: true,
            data: reminders
        });
    } catch (error) {
        logger.error('Error fetching reminders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reminders'
        });
    }
});

app.get('/api/sessions', basicAuth, async (_, res) => {
    try {
        const sessions = await db('sessions').select('*');
        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        logger.error('Error fetching sessions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sessions'
        });
    }
});

// Start server and bot
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
bot.launch().then(() => logger.info('Telegram bot started'));

// Graceful shutdown
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  db.destroy();
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  db.destroy();
});
require("dotenv").config();

module.exports = {
  // ===================== MAIN CONFIGS =====================
  SESSION_ID:   process.env.SESSION_ID,
  MONGODB_URI:  process.env.MONGODB_URI,
  PREFIX:       process.env.PREFIX  || ".",
  MODE:         process.env.MODE    || "public",
  OWNER_NUMBER: process.env.OWNER_NUMBER || "94707085822",
  OWNER_NAME:   process.env.OWNER_NAME   || "Savendra",
  BOT_NAME:     process.env.BOT_NAME     || "SHAVIYA-XMD V4",
  BOT_VERSION:  process.env.BOT_VERSION  || "V4",

  // ===================== OTHER CONFIGS =====================
  AUTO_VOICE:              process.env.AUTO_VOICE              === "true",
  AUTO_AI:                 process.env.AUTO_AI                 === "true",
  ANTI_BAD_WORDS_ENABLED:  process.env.ANTI_BAD_WORDS_ENABLED  === "true",
  AUTO_READ_STATUS:        process.env.AUTO_READ_STATUS        === "true",
  ANTI_BAD_WORDS:          (process.env.ANTI_BAD_WORDS || "").split(","),
  ANTILINK:                process.env.ANTILINK                === "true",
  ALWAYS_ONLINE:           process.env.ALWAYS_ONLINE          === "true",
  AUTO_READ_CMD:           process.env.AUTO_READ_CMD           === "true",
  ALWAYS_TYPING:           process.env.ALWAYS_TYPING           === "true",
  ALWAYS_RECORDING:        process.env.ALWAYS_RECORDING        === "true",
  ANTI_BOT:                process.env.ANTI_BOT                === "true",
  ANTI_DELETE:             process.env.ANTI_DELETE             === "true",

  PACKNAME: process.env.PACKNAME || "SHAVIYA-XMD V4",
  AUTHOR:   process.env.AUTHOR   || "𝗦𝗛𝗔𝗩𝗜𝗬𝗔 𝗧𝗘𝗖𝗛 💎",

  // ===================== API KEYS =====================
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
  ELEVENLABS_API_KEY:  process.env.ELEVENLABS_API_KEY,
  SHODAN_API:          process.env.SHODAN_API,
  PEXELS_API_KEY:      process.env.PEXELS_API_KEY,
  OMDB_API_KEY:        process.env.OMDB_API_KEY,
  PIXABAY_API_KEY:     process.env.PIXABAY_API_KEY,
  GOOGLE_API_KEY:      process.env.GOOGLE_API_KEY,
  GOOGLE_CX:           process.env.GOOGLE_CX,
  PASTEBIN_API_KEY:    process.env.PASTEBIN_API_KEY,
  OPENAI_API_KEY:      process.env.OPENAI_API_KEY,
  GEMINI_API_KEY:      process.env.GEMINI_API_KEY,

  // ===================== START/ALIVE/MENU =====================
  START_MSG: process.env.START_MSG,
  ALIVE_IMG: process.env.ALIVE_IMG || "https://files.catbox.moe/s1pn69.jpg",
  ALIVE_MSG: process.env.ALIVE_MSG || "Hello 👋 I am SHAVIYA-XMD V4 💎",
  MENU_IMG:  process.env.MENU_IMG  || "https://files.catbox.moe/eqmiio.jpg",
  MENU_MSG:  process.env.MENU_MSG  || "Main Menu",

  // ===================== MENU TIMEOUTS =====================
  MENU_TIMEOUT:       10 * 60 * 1000,  // 10 minutes (general menus)
  MOVIE_MENU_TIMEOUT: 20 * 60 * 1000,  // 20 minutes (movie menus)
};

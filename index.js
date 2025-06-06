// /srv/stealth-astrobot/index.js
require("dotenv").config();
const { Telegraf } = require("telegraf");
const logger = require("./src/logger");

const bot = new Telegraf(process.env.BOT_TOKEN);
const flow = new Map(); // userId → "general" | "horoscope" | "transit" | "love" | "career" | "compat"

// ─── подключаем все модули ──────────────────────────────
require("./src/commands/startCommands")(bot);
require("./src/commands/Admin/admin")(bot);

// платные разделы:
require("./src/commands/Client/Pay/compatibility")(bot, flow);
require("./src/commands/Client/Pay/love")(bot, flow); //поменял местами
require("./src/commands/Client/Pay/career")(bot, flow);

// бесплатные разделы:
require("./src/commands/Client/Free/general")(bot, flow);
require("./src/commands/Client/Free/horoscope")(bot, flow);
require("./src/commands/Client/Free/transit")(bot, flow);
// ─────────────────────────────────────────────────────────

bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

logger.info("🤖 Бот АстроРазвода в деле");

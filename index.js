require("dotenv").config();
const { Telegraf } = require("telegraf");
const logger = require("./src/logger");

const bot = new Telegraf(process.env.BOT_TOKEN);
const flow = new Map();

// Обработка неотловленных ошибок
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.stack}`);
});

bot.catch((err, ctx) => {
  logger.error(`[Bot] Error for ${ctx.updateType}: ${err.stack}`);
  ctx.reply("❌ Произошла ошибка, попробуйте позже");
});

require("./src/commands/startCommands")(bot);
require("./src/commands/Admin/admin")(bot);
require("./src/commands/Client/Pay/compatibility")(bot, flow);
require("./src/commands/Client/Pay/love")(bot, flow);
require("./src/commands/Client/Pay/career")(bot, flow);
require("./src/commands/Client/Free/general")(bot, flow);
require("./src/commands/Client/Free/horoscope")(bot, flow);
require("./src/commands/Client/Free/transit")(bot, flow);
require("./src/cron/dailyPins")(bot);


bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

logger.info("🤖 Бот АстроРазвода в деле");

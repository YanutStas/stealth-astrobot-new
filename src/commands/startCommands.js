// 📁 src/commands/startCommands.js
const { Markup } = require("telegraf");
const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

module.exports = (bot) => {
  /* ── цены платных мини-отчётов ── */
  const PRICES = { love: 50, career: 50, compat: 150 };

  /* ── единый рендер главного меню ── */
  const sendMainMenu = async (ctx) => {
    const name = ctx.from.first_name || "друг";
    const uid = ctx.from.id.toString();
    const dailyOn = await redis.sismember("daily_subs", uid);

    await ctx.reply(
      `🌠 *Привет, ${name}!*  
Здесь ты можешь получить:

🆓 *Бесплатно*  
• 🔮 Натальная карта — базовый портрет  
• ✨ Гороскоп на неделю — 7-дневный прогноз  
• 🔭 Транзит — текущие влияния планет  
• 🌠 Совет дня — короткий пин-совет (${dailyOn ? "включён" : "выключен"})

💰 *Платные отчёты* (моментальная оплата)  
• 💕 Любовь — *${PRICES.love} ₽*  
• 💼 Карьера — *${PRICES.career} ₽*  
• ❤️ Совместимость — *${PRICES.compat} ₽*

Выбирай нужное 👇`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔮 Натальная карта", "general_start")],
          [Markup.button.callback("✨ Гороскоп на неделю", "horoscope_start")],
          [Markup.button.callback("🔭 Транзит", "transit_start")],
          [
            Markup.button.callback(
              dailyOn ? "🌠 Совет дня ▸ выключить" : "🌠 Совет дня ▸ включить",
              "daily_toggle"
            ),
          ],
          [Markup.button.callback(`💕 Любовь — ${PRICES.love}₽`, "love_start")],
          [
            Markup.button.callback(
              `💼 Карьера — ${PRICES.career}₽`,
              "career_start"
            ),
          ],
          [
            Markup.button.callback(
              `❤️ Совместимость — ${PRICES.compat}₽`,
              "compat_start"
            ),
          ],
        ]),
      }
    );
  };

  /* ── /start и «◀️ Назад» ── */
  bot.start(sendMainMenu);
  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    sendMainMenu(ctx);
  });

  /* ── переключатель «Совет дня» ── */
  bot.action("daily_toggle", async (ctx) => {
    await ctx.answerCbQuery();
    const uid = ctx.from.id.toString();
    const on = await redis.sismember("daily_subs", uid);

    if (on) {
      await redis.srem("daily_subs", uid);
      ctx.reply("🛑 Ежедневные советы выключены.");
    } else {
      await redis.sadd("daily_subs", uid);
      ctx.reply("✅ Включено! Буду присылать совет и закреплять его.");
    }
    /* перерисовываем меню, чтобы статус кнопки обновился */
    sendMainMenu(ctx);
  });
};

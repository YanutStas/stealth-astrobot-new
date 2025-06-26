// 📁 src/commands/startCommands.js
const { Markup } = require("telegraf");
const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

/* ── цены платных мини-отчётов ── */
const PRICES = { love: 50, career: 50, compat: 150 };

/* ── единый рендер главного меню ── */
async function sendMainMenu(ctx) {
  const name = ctx.from.first_name || "друг";
  const uid = ctx.from.id.toString();
  const dailyOn = await redis.sismember("daily_subs", uid);

  const menuText = `🌠 *Привет, ${name}!*  

🆓 *Бесплатно*  
• 🔮 Натальная карта — базовый портрет  
• ✨ Гороскоп на неделю — 7-дневный прогноз  
• 🔭 Транзит — текущие влияния планет  
• 🌠 Совет дня — короткий пин-совет (${dailyOn ? "включён" : "выключен"})

💰 *Платные отчёты* (оплата переводом)  
• 💕 Любовь — *${PRICES.love} ₽*  
• 💼 Карьера — *${PRICES.career} ₽*  
• ❤️ Совместимость — *${PRICES.compat} ₽*

Выбирай нужное 👇`;

  const keyboard = Markup.inlineKeyboard([
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
    [Markup.button.callback(`💼 Карьера — ${PRICES.career}₽`, "career_start")],
    [
      Markup.button.callback(
        `❤️ Совместимость — ${PRICES.compat}₽`,
        "compat_start"
      ),
    ],
  ]);

  /* если это callback-запрос и в исходном сообщении есть text — пробуем редактировать;
     если же сообщение — фото/документ/что-то без text, просто шлём новое */
  if (ctx.callbackQuery) {
    const msg = ctx.callbackQuery.message;
    if (msg && (msg.text || msg.caption)) {
      try {
        /* у фото/видео есть caption, но Telegram не разрешает editMessageText —
           поэтому проверяем, что поле text заполнено */
        if (msg.text) {
          await ctx.editMessageText(menuText, {
            parse_mode: "Markdown",
            ...keyboard,
          });
          return;
        }
      } catch (e) {
        // падаем в отправку нового
      }
    }
  }

  await ctx.reply(menuText, { parse_mode: "Markdown", ...keyboard });
}

module.exports = (bot) => {
  /* /start */
  bot.start(sendMainMenu);

  /* «Назад» */
  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    await sendMainMenu(ctx);
  });

  /* переключатель «Совет дня» */
  bot.action("daily_toggle", async (ctx) => {
    await ctx.answerCbQuery();
    const uid = ctx.from.id.toString();
    const isOn = await redis.sismember("daily_subs", uid);

    if (isOn) {
      await redis.srem("daily_subs", uid);
      await ctx.reply("🛑 Ежедневные советы выключены.");
    } else {
      await redis.sadd("daily_subs", uid);
      await ctx.reply("✅ Включено! Буду присылать совет и закреплять его.");
    }

    await sendMainMenu(ctx); // перерисовываем меню
  });
};

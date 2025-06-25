// 📁 src/commands/startCommands.js
const { Markup } = require("telegraf");
const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

/* ── цены платных мини-отчётов ── */
const PRICES = { love: 50, career: 50, compat: 150 };

/* ── вспомогалка: текст главного меню ── */
function makeMenuText(name, dailyOn) {
  return `🌠 *Привет, ${name}!*  
Здесь ты можешь получить:

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
}

/* ── клавиатура главного меню ── */
function makeMenuKeyboard(dailyOn) {
  return Markup.inlineKeyboard([
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
}

module.exports = (bot) => {
  /* ── отправка / редактирование главного меню ── */
  const sendMainMenu = async (ctx, edit = false) => {
    const name = ctx.from.first_name || "друг";
    const uid = ctx.from.id.toString();
    const dailyOn = await redis.sismember("daily_subs", uid);
    const text = makeMenuText(name, !!dailyOn);
    const keyboard = makeMenuKeyboard(!!dailyOn).reply_markup;

    if (edit) {
      /* редактируем существующее сообщение (из callback-query) */
      await ctx.editMessageText(text, {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    } else {
      /* отправка нового сообщения (/start, «Назад») */
      await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard });
    }
  };

  /* ── /start ── */
  bot.start((ctx) => sendMainMenu(ctx));

  /* ── «◀️ Назад» ── */
  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    sendMainMenu(ctx, true);
  });

  /* ── переключатель «Совет дня» ── */
  bot.action("daily_toggle", async (ctx) => {
    const uid = ctx.from.id.toString();
    const on = await redis.sismember("daily_subs", uid);

    if (on) {
      await redis.srem("daily_subs", uid);
      await ctx.answerCbQuery("🛑 Ежедневные советы выключены.", {
        show_alert: true,
      });
    } else {
      await redis.sadd("daily_subs", uid);
      await ctx.answerCbQuery(
        "✅ Включено! Буду присылать совет и закреплять его.",
        { show_alert: true }
      );
    }

    /* обновляем текст и подпись кнопки прямо в том же сообщении */
    sendMainMenu(ctx, true);
  });
};

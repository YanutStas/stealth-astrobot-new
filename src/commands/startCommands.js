const { Markup } = require("telegraf");

module.exports = (bot) => {
  bot.start(async (ctx) => {
    const name = ctx.from.first_name || "друг";
    await ctx.reply(
      `🌠 Привет, ${name}! Я собираю космические досье.\n` +
        `Выбери, что интереснее прямо сейчас 👇`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "🔮 Общая натальная карта (бесплатно)",
            "general_start"
          ),
        ],
        [
          Markup.button.callback(
            "✨ Гороскоп на неделю(бесплатно)",
            "horoscope_start"
          ),
        ],
        [Markup.button.callback("🔭 Транзит (бесплатно)", "transit_start")],
        [Markup.button.callback("💕 Любовь (платно)", "love_start")],
        [Markup.button.callback("💼 Карьера (платно) 123", "career_start")],
        [Markup.button.callback("❤️ Совместимость (платно)", "compat_start")],
      ])
    );
  });

  bot.action("back_to_menu", async (ctx) => {
    await ctx.answerCbQuery();
    const name = ctx.from.first_name || "друг";
    await ctx.reply(
      `🌠 Привет, ${name}! Я собираю космические досье.\n` +
        `Выбери, что интереснее прямо сейчас 👇`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "🔮 Общая натальная карта (бесплатно)",
            "general_start"
          ),
        ],
        [
          Markup.button.callback(
            "✨ Гороскоп на неделю(бесплатно)",
            "horoscope_start"
          ),
        ],
        [Markup.button.callback("🔭 Транзит (бесплатно)", "transit_start")],
        [Markup.button.callback("💕 Любовь (платно)", "love_start")],
        [Markup.button.callback("💼 Карьера (платно)", "career_start")],
        [Markup.button.callback("❤️ Совместимость (платно)", "compat_start")],
      ])
    );
  });
};

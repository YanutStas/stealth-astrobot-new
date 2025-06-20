//  src/commands/Client/Free/horoscope.js
const { Markup } = require("telegraf");
const { DateTime } = require("luxon");
const { runFreeLLM } = require("./freeFactory");

const SIGNS = [
  "Овен",
  "Телец",
  "Близнецы",
  "Рак",
  "Лев",
  "Дева",
  "Весы",
  "Скорпион",
  "Стрелец",
  "Козерог",
  "Водолей",
  "Рыбы",
];

module.exports = (bot, flow) => {
  /* меню выбора знака */
  bot.action("horoscope_start", async (ctx) => {
    await ctx.answerCbQuery();
    flow.set(ctx.from.id, "horoscope");
    await ctx.reply(
      "✨ Выберите ваш знак Зодиака:",
      Markup.inlineKeyboard(
        SIGNS.map((s) => [Markup.button.callback(s, `hs_${s}`)])
      )
    );
  });

  /* сам прогноз */
  SIGNS.forEach((sign) => {
    bot.action(`hs_${sign}`, async (ctx) => {
      if (flow.get(ctx.from.id) !== "horoscope") return;
      await ctx.answerCbQuery();

      const today = DateTime.local().toFormat("dd.MM.yyyy");
      const prompt = `Гороскоп на неделю для знака «${sign}» (${today}).

1. 🌟 Общие тенденции (избегай тем любви, карьеры, денег)
2. 💡 Совет дня (нейтральный, практичный)`;

      await runFreeLLM(ctx, {
        prompt,
        sysMsg:
          "Ты дружелюбный астролог. Пиши структурировано, кратко, с эмодзи. Запрещены темы любви, денег, карьеры.",
        waitText: "🔮 Составляю прогноз…",
        featTag: "horoscope",
      });
    });
  });
};

/*  src/commands/Client/Free/horoscope.js  */
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
  /* — меню выбора знака — */
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

  /* — ответ по каждому знаку — */
  SIGNS.forEach((sign) => {
    bot.action(`hs_${sign}`, async (ctx) => {
      if (flow.get(ctx.from.id) !== "horoscope") return;
      await ctx.answerCbQuery();

      const today = DateTime.local().toFormat("dd.MM.yyyy");
      const prompt = `Дай краткий гороскоп на неделю для знака «${sign}», сегодня ${today}.
Ответ в 2 блоках (≤500 символов):
1. Общие тенденции
2. Здоровье
Без любви, денег и совместимости.`;

      const backKb = Markup.inlineKeyboard([
        [Markup.button.callback("Назад ◀️", "back_to_menu")],
      ]);

      await runFreeLLM(ctx, {
        prompt,
        sysMsg: "Пиши дружелюбно, с эмодзи.",
        waitText: "🔮 Составляю прогноз…",
        featTag: "horoscope",
        keyboard: backKb,
      });

      /* остаёмся в режиме — можно сразу выбрать другой знак */
    });
  });
};

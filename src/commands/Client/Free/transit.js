/*  src/commands/Client/Free/transit.js  */
const { Markup } = require("telegraf");
const { DateTime } = require("luxon");
const { runFreeLLM } = require("./freeFactory");

module.exports = (bot, flow) => {
  /* меню транзита */
  bot.action("transit_start", async (ctx) => {
    await ctx.answerCbQuery();
    flow.set(ctx.from.id, "transit");
    await ctx.reply(
      "🔭 Выберите период для транзита:",
      Markup.inlineKeyboard([
        [Markup.button.callback("Сегодня", "tr_today")],
        [Markup.button.callback("Завтра", "tr_tomorrow")],
      ])
    );
  });

  const make = (label, dateFn) => async (ctx) => {
    if (flow.get(ctx.from.id) !== "transit") return;
    await ctx.answerCbQuery();

    const date = dateFn().toFormat("dd.MM.yyyy");
    const prompt = `Краткий астрологический транзит на ${label.toLowerCase()} (${date}).
Ответ тремя пронумерованными абзацами (≤500 символов):
1. Общий обзор планет
2. Эмоции
3. Шутливый совет
Без любви, денег и совместимости.`;

    await runFreeLLM(ctx, {
      prompt,
      sysMsg: "Пиши дружелюбно, с эмодзи.",
      waitText:
        label === "Сегодня"
          ? "♒️ Рассчитываю транзит на сегодня…"
          : "♒️ Рассчитываю транзит на завтра…",
      featTag: `transit_${label.toLowerCase()}`,
    });
    /* остаёмся в режиме – можно запросить другой день */
  };

  bot.action(
    "tr_today",
    make("Сегодня", () => DateTime.local())
  );
  bot.action(
    "tr_tomorrow",
    make("Завтра", () => DateTime.local().plus({ days: 1 }))
  );
};

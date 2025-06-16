/*  src/commands/Client/Free/transit.js  */
const { Markup } = require("telegraf");
const { DateTime } = require("luxon");
const { runFreeLLM } = require("./freeFactory");

module.exports = (bot, flow) => {
  /* — меню «Транзит» — */
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

  const doTransit = (label, dateFn) => async (ctx) => {
    if (flow.get(ctx.from.id) !== "transit") return;
    await ctx.answerCbQuery();

    const date = dateFn().toFormat("dd.MM.yyyy");
    const prompt = `Краткий астрологический транзит на ${label.toLowerCase()} (${date}).
Ответ в 3 блоках (≤500 символов):
1. Общий обзор планет
2. Эмоции
3. Шутливый совет
Без любви, денег и совместимости.`;

    const backKb = Markup.inlineKeyboard([
      [Markup.button.callback("Назад ◀️", "back_to_menu")],
    ]);

    await runFreeLLM(ctx, {
      prompt,
      sysMsg: "Пиши дружелюбно, с эмодзи.",
      waitText:
        label === "Сегодня"
          ? "♒️ Рассчитываю транзит на сегодня…"
          : "♒️ Рассчитываю транзит на завтра…",
      featTag: `transit_${label.toLowerCase()}`,
      keyboard: backKb,
    });
  };

  bot.action(
    "tr_today",
    doTransit("Сегодня", () => DateTime.local())
  );
  bot.action(
    "tr_tomorrow",
    doTransit("Завтра", () => DateTime.local().plus({ days: 1 }))
  );
};

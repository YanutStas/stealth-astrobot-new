// 📁 src/commands/Client/Free/transit.js
const { Markup } = require("telegraf");
const { DateTime } = require("luxon");
const { runFreeLLM } = require("./freeFactory");

module.exports = (bot, flow) => {
  /* ── первое меню транзита ── */
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

  /* ── генератор обработчиков «сегодня / завтра» ── */
  const make = (label, dateFn) => async (ctx) => {
    if (flow.get(ctx.from.id) !== "transit") return;
    await ctx.answerCbQuery();

    const date = dateFn().toFormat("dd.MM.yyyy");
    const prompt =
      `Краткий астрологический транзит на ${label.toLowerCase()} (${date}).\n` +
      "Ответ тремя пронумерованными абзацами (≤500 символов):\n" +
      "1. Общий обзор планет\n" +
      "2. Эмоции\n" +
      "3. Шутливый совет\n" +
      "Без любви, денег и совместимости.";

    /* сначала берём текст без отправки… */
    const answer = await runFreeLLM(ctx, {
      prompt,
      sysMsg: "Пиши дружелюбно, с эмодзи.",
      waitText:
        label === "Сегодня"
          ? "♒️ Рассчитываю транзит на сегодня…"
          : "♒️ Рассчитываю транзит на завтра…",
      featTag: `transit_${label.toLowerCase()}`,
      send: false,
    });

    /* …затем публикуем его с кнопкой «Назад» */
    await ctx.reply(
      answer || "🌌 Космос молчит.",
      Markup.inlineKeyboard([
        [Markup.button.callback("Назад ◀️", "back_to_menu")],
      ])
    );
    /* flow остаётся "transit" — пользователь может нажать другой день */
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

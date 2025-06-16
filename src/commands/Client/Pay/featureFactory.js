const { Markup } = require("telegraf");
const axios = require("axios");
const pending = require("../../pendingStore");
const logger = require("../../../logger");
const MODELS = require("../../../models");

/* ── общее для всех платных фич ───────────────────────────── */
const COMMON_SYS =
  "Ты дружелюбный астролог-практик. Не вставляй «###» и не добавляй другие пункты, " +
  "заголовки, рекламу или ссылки. Русский язык, допускаются эмодзи. " +
  "Учитывай, что сейчас 2025 год.";

module.exports = function createPaidFeature(bot, flow, cfg) {
  const {
    key,
    buttonId,
    label,
    price,
    askText,
    waitText,
    hintText,
    regExp,
    sysMsg,
    buildPrompt,
  } = cfg;

  /* ---------- КНОПКА В МЕНЮ ---------- */
  bot.action(buttonId, async (ctx) => {
    await ctx.answerCbQuery();
    flow.set(ctx.from.id, key);
    pending.set(ctx.from.id, { label, ask: askText });

    logger.info(
      `[${key}] button pressed by @${ctx.from.username || ctx.from.id}`
    );

    await ctx.reply(
      `💳 Для получения *${label}* переведи ${price} ₽ на карту:\n` +
        "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
      { parse_mode: "Markdown" }
    );
  });

  /* ---------- ОСНОВНОЙ HEARS ---------- */
  bot.hears(
    (text, ctx) => flow.get(ctx.from.id) === key && regExp.test(text),
    async (ctx) => {
      const m = ctx.message.text.match(regExp);
      if (!m) {
        logger.warn(`[${key}] regex miss`);
        return;
      }

      await ctx.reply(waitText);

      const userPrompt = buildPrompt(m);
      const systemMsg = `${COMMON_SYS}\n${sysMsg}`;

      for (const model of MODELS) {
        try {
          const { data } = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              model,
              messages: [
                { role: "system", content: systemMsg },
                { role: "user", content: userPrompt },
              ],
            },
            {
              headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );

          const answer = (data.choices?.[0]?.message?.content || "").trim();

          /* ── логируем 1-ю часть ответа ── */
          logger.debug(
            `[${key}] ▼PROMPT(${model})\n${userPrompt}\n▲ANSWER(first400)\n${answer.slice(
              0,
              400
            )}…`
          );

          await ctx.reply(
            answer || "🌌 Космос молчит.",
            Markup.inlineKeyboard([
              [Markup.button.callback("Назад ◀️", "back_to_menu")],
            ])
          );

          logger.info(`[${key}] ok ${model}`);
          pending.delete(ctx.from.id);
          flow.delete(ctx.from.id);
          return;
        } catch (e) {
          logger.warn(
            `[${key}] FAIL ${model} | ${e.code || e.response?.status}`
          );
        }
      }

      await ctx.reply(
        "🛠️ Небо занято. Попробуй позже.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Назад ◀️", "back_to_menu")],
        ])
      );
    }
  );

  /* ---------- ПОДСКАЗКА / ПРОПУСК ---------- */
  bot.on("message", async (ctx, next) => {
    if (flow.get(ctx.from.id) === key) {
      await ctx.reply(hintText, { parse_mode: "Markdown" });
      return; // остаёмся в режиме; дальше не нужно
    }
    return next(); // пропускаем к остальным middlewares
  });
};

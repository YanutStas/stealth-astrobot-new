const { Markup } = require("telegraf");
const axios = require("axios");
const { DateTime } = require("luxon");

const pending = require("../../pendingStore");
const logger = require("../../../logger");
const MODELS = require("../../../models");

/* ——— общее системное сообщение ——— */
const COMMON_SYS =
  "Ты дружелюбный астролог-практик. Без «###», лишних пунктов, рекламы. " +
  "Русский язык, можно эмодзи. Сейчас 2025 год.";

const inProgress = new Map(); // uid → true
const usage = new Map(); // uid → { ts, count }
const DAILY_LIMIT = 30;

/* ——— запрос к LLM с повторами ——— */
async function fetchLLM(model, messages, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        { model, messages },
        {
          timeout: 20_000,
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      return (data.choices?.[0]?.message?.content || "").trim();
    } catch (e) {
      if (
        i < retries - 1 &&
        (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT")
      )
        continue;
      throw e;
    }
  }
}

/* ——— основной экспорт фабрики ——— */
module.exports = function createPaidFeature(bot, flow, cfg) {
  const {
    key,
    buttonId,
    label,
    price,
    payUrl,
    payCard = "2200 2803 5427 7545", // если нет payUrl — предлагаем перевод на карту
    askText,
    waitText,
    hintText,
    regExp,
    sysMsg,
    buildPrompt,
    validate,
    maxDaily = DAILY_LIMIT,
    maxRetries = 2,
  } = cfg;

  const log = logger.child({ feat: key });

  /* — кнопка в главном меню — */
  bot.action(buttonId, async (ctx) => {
    await ctx.answerCbQuery();
    flow.set(ctx.from.id, key);
    pending.set(ctx.from.id, { label, ask: askText });

    log.info({ uid: ctx.from.id }, "Нажата кнопка");

    const paymentInstruction = payUrl
      ? `💳 Для получения *${label}* сделай донат *${price} ₽* по ссылке:\n${payUrl}\n\nЗатем пришли скриншот чека 👇`
      : `💳 Для получения *${label}* переведи *${price} ₽* на карту:\n${payCard}\n\nЗатем пришли скриншот чека 👇`;

    await ctx.reply(paymentInstruction, { parse_mode: "Markdown" });
  });

  /* — основной hears (обработка данных после оплаты) — */
  bot.hears(
    (text, ctx) => flow.get(ctx.from.id) === key && regExp.test(text),
    async (ctx) => {
      const uid = ctx.from.id;

      if (inProgress.get(uid)) {
        await ctx.reply("⏳ Я ещё думаю над предыдущим ответом…");
        return;
      }

      /* суточный лимит */
      const dayStart = DateTime.local().startOf("day").toMillis();
      const stat = usage.get(uid) || { ts: dayStart, count: 0 };
      if (stat.ts !== dayStart) {
        stat.ts = dayStart;
        stat.count = 0;
      }
      if (stat.count >= maxDaily) {
        await ctx.reply(
          "🚦 Лимит запросов на сегодня исчерпан. Попробуй завтра!"
        );
        return;
      }

      const m = ctx.message.text.match(regExp);
      if (!m) {
        log.warn({ uid }, "Регэксп не сработал");
        return;
      }
      if (typeof validate === "function" && !validate(m)) {
        await ctx.reply(hintText, { parse_mode: "Markdown" });
        return;
      }

      inProgress.set(uid, true);
      stat.count += 1;
      usage.set(uid, stat);

      await ctx.reply(waitText);

      const userPrompt = buildPrompt(m);
      const systemMsg = `${COMMON_SYS}\n${sysMsg}`;
      const t0 = Date.now();

      try {
        for (const model of MODELS) {
          try {
            const answer = await fetchLLM(
              model,
              [
                { role: "system", content: systemMsg },
                { role: "user", content: userPrompt },
              ],
              maxRetries
            );

            log.info({ uid, model, t: Date.now() - t0 }, "Успешный ответ");
            await ctx.reply(
              answer || "🌌 Космос молчит.",
              Markup.inlineKeyboard([
                [Markup.button.callback("Назад ◀️", "back_to_menu")],
              ])
            );

            pending.delete(uid);
            flow.delete(uid);
            return;
          } catch (e) {
            log.warn(
              { uid, model, code: e.code || e.response?.status },
              "Ошибка модели"
            );
          }
        }

        await ctx.reply(
          "🛠️ Планеты перегружены. Попробуй позже.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Назад ◀️", "back_to_menu")],
          ])
        );
      } finally {
        inProgress.delete(uid);
      }
    }
  );

  /* — подсказка по формату, если пользователь ввёл что-то лишнее — */
  bot.on("message", async (ctx, next) => {
    if (flow.get(ctx.from.id) === key) {
      await ctx.reply(hintText, { parse_mode: "Markdown" });
      return;
    }
    return next();
  });
};

const { Markup } = require("telegraf");
const axios = require("axios");
const { DateTime } = require("luxon");

const pending = require("../../pendingStore");
const logger = require("../../../logger");
const MODELS = require("../../../models");

/* общее system-сообщение */
const COMMON_SYS =
  "Ты дружелюбный астролог-практик. Не вставляй «###», не добавляй лишние пункты, " +
  "заголовки, рекламу или ссылки. Русский язык, эмодзи приветствуются. " +
  "Учитывай, что сейчас 2025 год.";

/* анти-флуд и очередь */
const inProgress = new Map(); // uid → true
const usage = new Map(); // uid → { ts, count }
const DAILY_LIMIT = 30;

/* LLM-запрос с retry */
async function fetchLLM(model, messages, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        { model, messages },
        {
          timeout: 20000,
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
    validate,
    maxDaily = DAILY_LIMIT,
    maxRetries = 2,
  } = cfg;

  const log = logger.child({ feat: key });

  /* ── кнопка в меню ───────────────────────────────────── */
  bot.action(buttonId, async (ctx) => {
    await ctx.answerCbQuery();
    flow.set(ctx.from.id, key);
    pending.set(ctx.from.id, { label, ask: askText });

    log.info({ uid: ctx.from.id }, "Нажата кнопка");
    await ctx.reply(
      `💳 Для получения *${label}* переведи ${price} ₽ на карту:\n` +
        "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
      { parse_mode: "Markdown" }
    );
  });

  /* ── основной hears ─────────────────────────────────── */
  bot.hears(
    (text, ctx) => flow.get(ctx.from.id) === key && regExp.test(text),
    async (ctx) => {
      const uid = ctx.from.id;

      /* очередь */
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

      /* логируем короткий пользовательский ввод */
      const userText = ctx.message.text.trim().replace(/\n/g, " | ");
      log.info({ uid }, `Запрос: ${userText}`);

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

            const latency = Date.now() - t0;
            log.info({ uid, model, t: latency }, "Успешный ответ");

            const shortAns = answer.replace(/\s+/g, " ").slice(0, 400);
            log.debug({ uid, model }, `Ответ: ${shortAns}`);

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

  /* ── подсказка / пропуск ďalším middleware ─────────── */
  bot.on("message", async (ctx, next) => {
    if (flow.get(ctx.from.id) === key) {
      await ctx.reply(hintText, { parse_mode: "Markdown" });
      return;
    }
    return next();
  });
};

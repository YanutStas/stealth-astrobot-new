/*  src/commands/Client/Free/freeFactory.js  */
const { Markup } = require("telegraf");
const axios = require("axios");
const { DateTime } = require("luxon");
const logger = require("../../../logger");
const MODELS = require("../../../models");

const COMMON_SYS =
  "Ты дружелюбный астролог-практик. Не вставляй «###» и лишние пункты. " +
  "Пиши ≤1200 символов, русский, эмодзи допускаются. Сейчас 2025 год.";

const inProgress = new Map();

/* --- LLM helper -------------------------------------------------- */
async function runFreeLLM(
  ctx,
  { prompt, sysMsg, waitText, featTag, keyboard }
) {
  const uid = ctx.from.id;
  const t0 = Date.now();
  const log = logger.child({ feat: featTag });

  if (inProgress.get(uid)) {
    await ctx.reply("⏳ Секунду, я ещё думаю…");
    return;
  }

  inProgress.set(uid, true);
  await ctx.reply(waitText);

  for (const model of MODELS) {
    try {
      const { data } = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: `${COMMON_SYS}\n${sysMsg}` },
            { role: "user", content: prompt },
          ],
        },
        {
          timeout: 20000,
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const answer = (data.choices?.[0]?.message?.content || "").trim();
      log.info({ uid, model, t: Date.now() - t0 }, "Бесплатный ответ");

      await ctx.reply(answer || "🌌 Космос молчит.", {
        parse_mode: "Markdown",
        reply_markup: keyboard || undefined,
      });

      inProgress.delete(uid);
      return;
    } catch (e) {
      log.warn({ uid, model, code: e.code || e.response?.status }, "FAIL");
    }
  }

  await ctx.reply("🛠️ Космос занят. Попробуй позже.");
  inProgress.delete(uid);
}

/* --- createFreeFeature (для general) ----------------------------- */
function createFreeFeature(bot, flow, cfg) {
  const { buttonId, waitText, askText, regExp, buildPrompt, sysMsg, validate } =
    cfg;

  const log = logger.child({ feat: buttonId });

  bot.action(buttonId, async (ctx) => {
    await ctx.answerCbQuery();
    flow.delete(ctx.from.id);
    await ctx.reply(askText, { parse_mode: "Markdown" });
    log.info({ uid: ctx.from.id }, "Нажата бесплатная кнопка");
  });

  bot.hears(
    (text, ctx) => !flow.has(ctx.from.id) && regExp.test(text),
    async (ctx) => {
      const match = ctx.message.text.match(regExp);
      if (validate && !validate(match)) {
        await ctx.reply(askText, { parse_mode: "Markdown" });
        return;
      }

      const prompt = buildPrompt(match);
      runFreeLLM(ctx, {
        prompt,
        sysMsg,
        waitText,
        featTag: buttonId,
      });
    }
  );
}

module.exports = createFreeFeature;
module.exports.runFreeLLM = runFreeLLM;

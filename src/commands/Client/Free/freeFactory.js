"use strict";
/*  src/commands/Client/Free/freeFactory.js  */
const axios = require("axios");
const { Markup } = require("telegraf");
const logger = require("../../../logger");
const MODELS = require("../../../models");

const COMMON_SYS =
  "Ты дружелюбный астролог-практик. Не вставляй «###» и лишние пункты. " +
  "Пиши ≤1200 символов, русский язык, можно эмодзи. Сейчас 2025 год.";

const inProgress = new Map(); // uid → true

/* ──────────── LLM helper ──────────── */
async function runFreeLLM(
  ctx,
  {
    prompt,
    sysMsg,
    waitText,
    featTag,
    footer = "—\n🔓 Полный доступ к *любви, карьере и совместимости* — в платных функциях 👇",
    buttons = Markup.inlineKeyboard([
      [Markup.button.callback("Назад ◀️", "back_to_menu")],
    ]),
  }
) {
  const uid = ctx.from.id;
  const log = logger.child({ feat: featTag });
  const t0 = Date.now();

  if (inProgress.get(uid)) {
    await ctx.reply("⏳ Я ещё думаю над предыдущим ответом…");
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
      log.info({ uid, model, t: Date.now() - t0 }, "бесплатный ответ");

      await ctx.reply(`${answer}\n\n${footer}`, buttons);

      inProgress.delete(uid);
      return;
    } catch (e) {
      log.warn({ uid, model, code: e.code || e.response?.status }, "fail");
    }
  }

  await ctx.reply("🛠️ Космос занят. Попробуй позже.");
  inProgress.delete(uid);
}

/* ───────── createFeature (general.js) ───────── */
function createFreeFeature(bot, flow, cfg) {
  const { buttonId, waitText, askText, regExp, buildPrompt, sysMsg, validate } =
    cfg;

  bot.action(buttonId, async (ctx) => {
    await ctx.answerCbQuery();
    flow.delete(ctx.from.id);
    await ctx.reply(askText, { parse_mode: "Markdown" });
  });

  bot.hears(
    (txt, ctx) => !flow.has(ctx.from.id) && regExp.test(txt),
    (ctx) => {
      const m = ctx.message.text.match(regExp);
      if (validate && !validate(m)) {
        ctx.reply(askText, { parse_mode: "Markdown" });
        return;
      }
      runFreeLLM(ctx, {
        prompt: buildPrompt(m),
        sysMsg,
        waitText,
        featTag: buttonId,
      });
    }
  );
}

module.exports = createFreeFeature;
module.exports.runFreeLLM = runFreeLLM;

const axios = require("axios");
const { Markup } = require("telegraf");
const logger = require("../../../logger");
const MODELS = require("../../../models");

const COMMON_SYS =
  "Ты дружелюбный астролог-практик. Не вставляй «###» и лишние пункты. " +
  "Пиши ≤1200 символов, русский язык, можно эмодзи. Сейчас 2025 год.";

const inProgress = new Map(); // uid → true

/* ──────────── LLM-helper ──────────── */
async function runFreeLLM(
  ctx,
  {
    prompt,
    sysMsg,
    waitText = "", // строка или "", если ничего не слать
    featTag = "free",
    footer = "",
    buttons = null, // Markup.inlineKeyboard(...)
    send = true, // если false → вернуть answer без публикации
  }
) {
  const uid = ctx.from.id;
  const log = logger.child({ feat: featTag });
  const t0 = Date.now();

  if (inProgress.get(uid)) {
    if (send) await ctx.reply("⏳ Я ещё думаю над предыдущим ответом…");
    return;
  }
  inProgress.set(uid, true);

  if (waitText) await ctx.reply(waitText);

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

      inProgress.delete(uid);

      if (!send) return answer;

      await ctx.reply(
        `${answer}${footer ? `\n\n${footer}` : ""}`,
        buttons || {}
      );
      return answer;
    } catch (e) {
      log.warn({ uid, model, code: e.code || e.response?.status }, "fail");
    }
  }

  if (send) await ctx.reply("🛠️ Космос занят. Попробуй позже.");
  inProgress.delete(uid);
  return null;
}

module.exports = { runFreeLLM };

// src/commands/Client/Free/transit.js

const axios = require("axios");
const { DateTime } = require("luxon");
const { Markup } = require("telegraf");
const logger = require("../../../logger");
const MODELS = require("../../../models");

module.exports = (bot, flow) => {
  /* ── Кнопка «Транзит (бесплатно)» ───────────────────────────────── */
  bot.action("transit_start", async (ctx) => {
    await ctx.answerCbQuery();

    // Переходим в режим “transit”
    flow.set(ctx.from.id, "transit");

    await ctx.reply(
      "🔭 Выберите, пожалуйста, период для транзита:\n\n",
      Markup.inlineKeyboard([
        [Markup.button.callback("Сегодня", "transit_today")],
        [Markup.button.callback("Завтра", "transit_tomorrow")],
      ])
    );
  });

  /* ── Обработка транзита на сегодня ─────────────────────────────── */
  bot.action("transit_today", async (ctx) => {
    // Игнорируем, если не в режиме “transit”
    if (flow.get(ctx.from.id) !== "transit") {
      return;
    }
    await ctx.answerCbQuery();

    const t0 = Date.now();
    const tag = ctx.from.username || ctx.from.id;
    logger.info(`[transit] запрос @${tag} (сегодня)`);

    await ctx.reply("♒️ Рассчитываю транзиты на сегодня…");
    const today = DateTime.local().toFormat("dd.MM.yyyy");

    const userPrompt = `Дай, пожалуйста, краткий астрологический транзит на дату ${today}.  
Ответ раздели на три коротких блока (каждый блок — 1 абзац, максимум 500 символов):
1. Общий обзор планетных влияний  
2. Эмоции  
3. Шутливый совет на сегодня  

*Запрещено* упоминать любовь / отношения, деньги / карьеру и совместимость.  
Только русский, можно эмодзи.  

Пиши исключительно на русском языке, дружелюбно, с эмодзи. Не выходи за рамки 500 символов.`;

    for (const model of MODELS) {
      try {
        const { data } = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model,
            messages: [
              {
                role: "system",
                content:
                  "Ты дружелюбный астролог-практик. Пиши только на русском языке, по шаблону.",
              },
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
        logger.debug(
          `[transit] ▼PROMPT(${model})\n${userPrompt}\n▲ANSWER(first300)\n${answer.slice(
            0,
            300
          )}…`
        );

        await ctx.reply(
          (answer || "🌌 Транзит пока недоступен. Попробуйте позже.") +
            "\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
          { parse_mode: "Markdown" }
        );
        logger.info(`[transit] ok ${model} ${Date.now() - t0}мс`);

        flow.delete(ctx.from.id);
        return;
      } catch (e) {
        logger.warn(
          `[transit] FAIL ${model} | ${e.response?.status || e.code}`
        );
      }
    }

    await ctx.reply(
      "🛠️ Планеты перегружены. Попробуйте позже.\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
      { parse_mode: "Markdown" }
    );
    flow.delete(ctx.from.id);
  });

  /* ── Обработка транзита на завтра ─────────────────────────────── */
  bot.action("transit_tomorrow", async (ctx) => {
    // Игнорируем, если не в режиме “transit”
    if (flow.get(ctx.from.id) !== "transit") {
      return;
    }
    await ctx.answerCbQuery();

    const t0 = Date.now();
    const tag = ctx.from.username || ctx.from.id;
    logger.info(`[transit] запрос @${tag} (завтра)`);

    await ctx.reply("♒️ Рассчитываю транзиты на завтра…");
    const tomorrow = DateTime.local().plus({ days: 1 }).toFormat("dd.MM.yyyy");

    const userPrompt = `Дай, пожалуйста, краткий астрологический транзит на дату ${tomorrow}.  
Ответ раздели на три коротких блока (каждый блок — 1 абзац, максимум 500 символов):
1. Общий обзор планетных влияний  
2. Эмоции  
3. Шутливый совет на завтра  

*Запрещено* упоминать любовь / отношения, деньги / карьеру и совместимость.  
Только русский, можно эмодзи.  

Пиши исключительно на русском языке, дружелюбно, с эмодзи. Не выходи за рамки 500 символов.`;

    for (const model of MODELS) {
      try {
        const { data } = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model,
            messages: [
              {
                role: "system",
                content:
                  "Ты дружелюбный астролог-практик. Пиши только на русском языке, по шаблону.",
              },
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
        logger.debug(
          `[transit] ▼PROMPT(${model})\n${userPrompt}\n▲ANSWER(first300)\n${answer.slice(
            0,
            300
          )}…`
        );

        await ctx.reply(
          (answer || "🌌 Транзит пока недоступен. Попробуйте позже.") +
            "\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
          { parse_mode: "Markdown" }
        );
        logger.info(`[transit] ok ${model} ${Date.now() - t0}мс`);

        flow.delete(ctx.from.id);
        return;
      } catch (e) {
        logger.warn(
          `[transit] FAIL ${model} | ${e.response?.status || e.code}`
        );
      }
    }

    await ctx.reply(
      "🛠️ Планеты перегружены. Попробуйте позже.\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
      { parse_mode: "Markdown" }
    );
    flow.delete(ctx.from.id);
  });
};

const { Markup } = require("telegraf");
const axios = require("axios");
const logger = require("../../../logger");
const MODELS = require("../../../models");
const pending = require("../../pendingStore");

module.exports = (bot, flow) => {
  const feature = "career";
  const label = "карьерный прогноз";

  /* ── кнопка «Карьерный прогноз» ───────────────────────────────── */
  bot.action("career_start", async (ctx) => {
    await ctx.answerCbQuery();
    flow.set(ctx.from.id, feature);

    pending.set(ctx.from.id, {
      label,
      ask:
        "✨ Оплата подтверждена!\n\n" +
        "Для *карьерного прогноза* пришли одним сообщением:\n" +
        "1) 📅 Дата рождения ⏰ Время 🗺 Город\n" +
        "2) 💼 Текущая сфера / должность\n" +
        "3) 🎯 Главный карьерный вопрос (1-2 фразы)\n\n" +
        "Пример:\n" +
        "1) 12.09.1998 09:30 Смоленск\n" +
        "2) Маркетолог\n" +
        "3) Куда расти дальше?",
    });

    ctx.reply(
      `💳 Для получения *${label}* переведи 50 ₽ на карту:\n` +
        "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
      { parse_mode: "Markdown" }
    );
  });

  /* ── regexp: три поля через «;» или переводы строк ───────────────── */
  // Формат теперь ожидает три пункта через точку с запятой
  const careerReg =
    /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*[;\r\n]+\s*(?:2\)\s*)?(.+?)\s*[;\r\n]+\s*(?:3\)\s*)?(.+)$/;

  const SYSTEM_MSG =
    "Ты практичный астролог-HR. Отвечай строго 5 блоками: 1. Сильные стороны, 2. Риски и выгорание, 3. Поток денег и источники, 4. Рекомендованные форматы, 5. Важные периоды на ближайший год. " +
    "Не используй символы «#» в начале, ≤1200 символов, русский язык, дружелюбно, можно эмодзи. Учитывай, что сейчас 2025 год; без эзотерики и прогнозов о смерти.";

  /* ── основной обработчик ───────────────────────────────────────── */
  bot.hears(careerReg, async (ctx) => {
    if (flow.get(ctx.from.id) !== feature) return;

    const t0 = Date.now();
    const tag = ctx.from.username || ctx.from.id;
    logger.info(`[career] запрос @${tag}`);

    await ctx.reply("📈 Читаю карьерные линии…");

    // Собираем три части из regExp-групп
    const [, birth, profession, question] = ctx.message.text.match(careerReg);
    const userPrompt = `Составь карьерный прогноз по 5 блокам:

1. 🏆 Сильные стороны  
2. ⚠️ Риски и выгорание  
3. 💰 Поток денег и лучшие источники дохода  
4. 🚀 Рекомендованные форматы (офис/фриланс/бизнес)  
5. 📅 Важные периоды на ближайший год  

Дата рождения: ${birth}  
Сфера / должность: ${profession.trim()}  
Карьерный вопрос: ${question.trim()}`;

    for (const model of MODELS) {
      try {
        const { data } = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model,
            messages: [
              { role: "system", content: SYSTEM_MSG },
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
        await ctx.reply(answer || "🌌 Космос молчит.");
        logger.info(`[career] ok ${model} ${Date.now() - t0}мс`);
        pending.delete(ctx.from.id);
        flow.delete(ctx.from.id);
        return;
      } catch (e) {
        logger.warn(`[career] FAIL ${model} | ${e.code || e.response?.status}`);
      }
    }

    ctx.reply("🛠️ Сатурн ушёл в отпуск. Попробуй позже.");
  });
};

// const { Markup } = require("telegraf");
// const axios = require("axios");
// const logger = require("../../../logger");
// const MODELS = require("../../../models");
// const pending = require("../../pendingStore");

// module.exports = (bot, flow) => {
//   const feature = "career";
//   const label = "карьерный прогноз";

//   /* ── кнопка меню ───────────────────────────── */
//   bot.action("career_start", async (ctx) => {
//     await ctx.answerCbQuery();
//     flow.set(ctx.from.id, feature);

//     pending.set(ctx.from.id, {
//       label,
//       ask: `✨ Оплата подтверждена!

// Пришли данные чётко 4-мя строками:

// 1) 📅  Дата ⏰ Время
// 2) 🗺  Город рождения
// 3) 💼 Текущая сфера / должность
// 4) 🎯 Главный карьерный вопрос (1-2 фразы)

// Пример:
// 1) 13.05.1996 09:30
// 2) Казань
// 3) Маркетолог
// 4) Куда расти дальше?`,
//     });

//     ctx.reply(
//       `💳 Для получения *${label}* переведи 50 ₽ на карту:\n` +
//         "2200 7009 7760 7737\n\nЗатем пришли чек 👇",
//       { parse_mode: "Markdown" }
//     );
//   });

//   /* четыре нумерованные строки */
//   const careerReg = /^1\)[\s\S]+?\n2\)[\s\S]+?\n3\)[\s\S]+?\n4\)[\s\S]+/;

//   const SYSTEM_MSG =
//     "Ты практичный астролог-HR. Дай ровно 5 нумерованных блоков, " +
//     "каждый ≤3 строки, всего ≤1200 символов. Русский язык, без эзотерики и советов о смерти.";

//   bot.hears(careerReg, async (ctx) => {
//     if (flow.get(ctx.from.id) !== feature) return;

//     const tag = ctx.from.username || ctx.from.id;
//     const t0 = Date.now();
//     logger.info(`[career] запрос @${tag}`);

//     await ctx.reply("📈 Читаю карьерные линии…");

//     const userPrompt = `Составь *карьерный прогноз* по 5 блокам:

// 1. 🏆 Сильные стороны
// 2. ⚠️ Риски и выгорание
// 3. 💰 Поток денег и лучшие источники дохода
// 4. 🚀 Рекомендованные форматы (офис/фриланс/бизнес)
// 5. 📅 Важные периоды на ближайший год

// Дано:
// ${ctx.message.text.trim()}`;

//     for (const model of MODELS) {
//       try {
//         const { data } = await axios.post(
//           "https://openrouter.ai/api/v1/chat/completions",
//           {
//             model,
//             messages: [
//               { role: "system", content: SYSTEM_MSG },
//               { role: "user", content: userPrompt },
//             ],
//           },
//           {
//             headers: {
//               Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//               "Content-Type": "application/json",
//             },
//           }
//         );

//         const answer = (data.choices?.[0]?.message?.content || "")
//           .replace(/\*\*/g, "") // убираем жирное
//           .trim();

//         await ctx.reply(answer || "🌌 Космос молчит.");
//         logger.info(`[career] ok ${model} ${Date.now() - t0}мс`);
//         pending.delete(ctx.from.id);
//         flow.delete(ctx.from.id);
//         return;
//       } catch (e) {
//         logger.warn(`[career] FAIL ${model} | ${e.code || e.response?.status}`);
//       }
//     }
//     ctx.reply("🛠️ Сатурн ушёл в отпуск. Попробуй позже.");
//   });
// };

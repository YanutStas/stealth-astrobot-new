/*  src/commands/Client/Pay/compatibility.js  */
const { Markup } = require("telegraf");
const axios = require("axios");
const logger = require("../../../logger");
const MODELS = require("../../../models");
const pending = require("../../pendingStore");

module.exports = (bot, flow) => {
  const feature = "compat";
  const label = "совместимость пары";

  /* ── кнопка «Совместимость» ───────────────────────────────────────── */
  bot.action("compat_start", async (ctx) => {
    await ctx.answerCbQuery();
    flow.set(ctx.from.id, feature);

    pending.set(ctx.from.id, {
      label,
      ask:
        "✨ Оплата подтверждена!\n\n" +
        "Пришли *две карты* двумя строками (можно с нумерацией):\n" +
        "1) 📅 Дата ⏰ Время 🗺 Город\n" +
        "2) 📅 Дата ⏰ Время 🗺 Город\n\n" +
        "Пример:\n" +
        "1) 10.04.1995 09:30 Смоленск\n" +
        "2) 25.12.1996 14:45 Казань",
    });

    ctx.reply(
      `💳 Чтобы узнать *${label}* переведи 50 ₽ на карту:\n` +
        "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
      { parse_mode: "Markdown" }
    );
  });

  /* ── regexp: две строки (CR/LF), опционально с «1)» / «2)» ───── */
  const dualReg =
    /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*(?:\r?\n|\r)\s*(?:2\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+)$/;

  const SYSTEM_MSG =
    "Ты дружелюбный астролог-практик. Отвечай *ровно пятью* нумерованными блоками (1-5), " +
    "каждый ≤3 строки, весь ответ ≤1200 символов. Не вставляй «###» и не добавляй другие пункты, " +
    "заголовки, рекламу или ссылки. Русский язык, допускаются эмодзи. Учитывай, что сейчас 2025 год.";

  /* ── основной обработчик ───────────────────────────────────────── */
  bot.hears(dualReg, async (ctx) => {
    if (flow.get(ctx.from.id) !== feature) return;

    const [, cardA, cardB] = ctx.message.text.match(dualReg);
    const tag = ctx.from.username || ctx.from.id;
    const t0 = Date.now();
    logger.info(`[compat] запрос @${tag}`);

    await ctx.reply("💞 Сверяю звёздные паспорта пары…");

    const userPrompt = `Сделай совместимость пары по 5 блокам:

1. 🌟 Общее впечатление  
2. 💗 Эмоции / быт  
3. 🔥 Интим / страсть  
4. 🤝 Конфликты и рост  
5. ✨ Потенциал на год вперёд  

Партнёр A: ${cardA}  
Партнёр B: ${cardB}`;

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

        /* полное логирование запроса/ответа */
        logger.info(
          `[compat] ▼PROMPT(${model})\n${SYSTEM_MSG}\n---\n${userPrompt}` +
            `\n▲ANSWER(first500)\n${answer.slice(0, 500)}…`
        );

        /* sanity-check: 5 блоков */
        if (!/^1\./m.test(answer) || answer.split(/\n[2-5]\./).length < 5) {
          logger.warn(`[compat] wrong-shape ${model}`);
          continue;
        }

        await ctx.reply(answer);
        logger.info(`[compat] ok ${model} ${Date.now() - t0}мс`);
        pending.delete(ctx.from.id);
        flow.delete(ctx.from.id);
        return;
      } catch (e) {
        logger.warn(
          `[compat] FAIL ${model} | ${e.response?.status || e.code} ${
            e.message
          }`
        );
      }
    }

    ctx.reply("🛠️ Планеты спорят. Попробуй позже.");
  });
};

// /*  src/commands/Client/Pay/compatibility.js  */
// const { Markup } = require("telegraf");
// const axios = require("axios");
// const logger = require("../../../logger");
// const MODELS = require("../../../models");
// const pending = require("../../pendingStore");

// module.exports = (bot, flow) => {
//   const feature = "compat";
//   const label = "совместимость пары";

//   /* ───── кнопка «Совместимость» ─────────────────────────────────── */
//   bot.action("compat_start", async (ctx) => {
//     await ctx.answerCbQuery();
//     flow.set(ctx.from.id, feature);

//     pending.set(ctx.from.id, {
//       label,
//       ask:
//         "✨ Оплата подтверждена!\n\n" +
//         "Пришли *две карты* двумя строками (можно с нумерацией):\n" +
//         "1) 📅 Дата ⏰ Время 🗺 Город\n" +
//         "2) 📅 Дата ⏰ Время 🗺 Город\n\n" +
//         "Пример:\n" +
//         "1) 20.03.1996 09:30 Москва\n" +
//         "2) 25.12.1996 14:45 Москва",
//     });

//     ctx.reply(
//       `💳 Чтобы узнать *${label}* переведи 50 ₽ на карту:\n` +
//         "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
//       { parse_mode: "Markdown" }
//     );
//   });

//   /* ───── regexp: две строки с опциональными 1)/2) ──────────────── */
//   const dualReg =
//     /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*(?:\r?\n|\r)\s*(?:2\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+)$/;

//   const SYSTEM_MSG =
//     "Ты дружелюбный астролог-практик. Отвечай *ровно пятью* нумерованными блоками (1-5), " +
//     "каждый ≤3 строки, весь ответ ≤1200 символов. Никаких предисловий, лишних пунктов, ссылок. " +
//     "Русский язык, допускаются эмодзи.";

//   /* ───── обработчик запроса ────────────────────────────────────── */
//   bot.hears(dualReg, async (ctx) => {
//     if (flow.get(ctx.from.id) !== feature) return;

//     const [, cardA, cardB] = ctx.message.text.match(dualReg);
//     const tag = ctx.from.username || ctx.from.id;
//     const t0 = Date.now();
//     logger.info(`[compat] запрос @${tag}`);

//     await ctx.reply("💞 Сверяю звёздные паспорта пары…");

//     const userPrompt = `Сделай *совместимость* пары по 5 блокам:

// 1. 🌟 Общее впечатление
// 2. 💗 Эмоции / быт
// 3. 🔥 Интим / страсть
// 4. 🤝 Конфликты и рост
// 5. ✨ Потенциал на год вперёд

// Партнёр A: ${cardA}
// Партнёр B: ${cardB}`;

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

//         const answer = (data.choices?.[0]?.message?.content || "").trim();

//         logger.info(
//           `[compat] ▼PROMPT(${model})\n${SYSTEM_MSG}\n---\n${userPrompt}` +
//             `\n▲ANSWER(first500)\n${answer.slice(0, 500)}…`
//         );

//         /* sanity-check: 5 блоков */
//         if (!/^1\./m.test(answer) || answer.split(/\n[2-5]\./).length < 5) {
//           logger.warn(`[compat] wrong-shape ${model}`);
//           continue;
//         }

//         await ctx.reply(answer);
//         logger.info(`[compat] ok ${model} ${Date.now() - t0}мс`);
//         pending.delete(ctx.from.id);
//         flow.delete(ctx.from.id);
//         return;
//       } catch (e) {
//         logger.warn(
//           `[compat] FAIL ${model} | ${e.response?.status || e.code} ${
//             e.message
//           }`
//         );
//       }
//     }

//     ctx.reply("🛠️ Планеты спорят. Попробуй позже.");
//   });
// };

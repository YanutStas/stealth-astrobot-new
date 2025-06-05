/*  src/commands/Client/Pay/love.js  */
const { Markup } = require("telegraf");
const axios = require("axios");
const logger = require("../../../logger");
const MODELS = require("../../../models");
const pending = require("../../pendingStore");

module.exports = (bot, flow) => {
  const feature = "love";
  const label = "анализ любви и отношений";

  /* ── кнопка «Анализ любви» ───────────────────────────────────────── */
  bot.action("love_start", async (ctx) => {
    await ctx.answerCbQuery();
    flow.set(ctx.from.id, feature);

    pending.set(ctx.from.id, {
      label,
      ask:
        "✨ Оплата подтверждена!\n\n" +
        "Для *анализа любви и отношений* пришли четырьмя строками:\n" +
        "1) 📅 Дата рождения ⏰ Время 🗺 Город\n" +
        "2) 💖 Семейное положение (свободна, замужем и т.д.)\n" +
        "3) ❓ Что волнует (1-2 фразы)\n" +
        "Пример:\n" +
        "1) 01.01.2000 10:00 Москва\n" +
        "2) встречаюсь\n" +
        "3) почему повторяются конфликты?",
    });

    ctx.reply(
      `💳 Для получения *${label}* переведи 50 ₽ на карту:\n` +
        "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
      { parse_mode: "Markdown" }
    );
  });

  /* ── regexp: четыре строки с опциональной нумерацией 1)-4) ─────── */
  const loveReg =
    /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*(?:\r?\n|\r)\s*(?:2\)\s*)?(.+?)\s*(?:\r?\n|\r)\s*(?:3\)\s*)?(.+?)\s*(?:\r?\n|\r)\s*(?:4\)\s*)?(.+)$/;

  const SYSTEM_MSG =
    "Ты мягкий астролог-коуч. Отвечай строго 5 блоками: 1. Личная любовь-энергия, 2. Эмоции/выражение чувств, 3. Партнёрский потенциал, 4. Точки роста/проблемы, 5. Совет на ближайший год. " +
    "Не используй символы «#» в начале блоков, ≤1200 символов, тёплый русский, эмодзи приветствуются. Учитывай, что сейчас 2025 год. " +
    "Запрещено прогнозировать смерть, болезни и давать финансовые советы.";

  /* ── основной обработчик ───────────────────────────────────────── */
  bot.hears(loveReg, async (ctx) => {
    if (flow.get(ctx.from.id) !== feature) return;

    const t0 = Date.now();
    const tag = ctx.from.username || ctx.from.id;
    logger.info(`[love] запрос @${tag}`);

    await ctx.reply("💌 Читаю любовные линии…");

    // Собираем четыре части из regExp-групп
    const [, birth, status, concern, extra] = ctx.message.text.match(loveReg);
    // «extra» здесь может содержать фразу-вопрос, если пользователь ввёл 4-й пункт
    const userPrompt = `Сделай анализ любви и отношений по 5 блокам:

1. ❤️ Личная любовь-энергия  
2. 💞 Эмоции / выражение чувств  
3. 💍 Партнёрский потенциал  
4. ⚠️ Точки роста / проблемы  
5. ✨ Совет на ближайший год  

Дата рождения: ${birth.trim()}  
Семейное положение: ${status.trim()}  
Что волнует: ${concern.trim()}  
Дополнительно (если есть): ${extra.trim()}`;

    for (const model of MODELS) {
      try {
        const { data } = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model,
            messages: [
              { role: "system", content: SYSTEM_MSG },
              { role: "user",   content: userPrompt },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type":  "application/json",
            },
          }
        );

        const answer = (data.choices?.[0]?.message?.content || "").trim();
        await ctx.reply(answer || "🌌 Космос молчит.");
        logger.info(`[love] ok ${model} ${Date.now() - t0}мс`);
        pending.delete(ctx.from.id);
        flow.delete(ctx.from.id);
        return;
      } catch (e) {
        logger.warn(`[love] FAIL ${model} | ${e.code || e.response?.status}`);
      }
    }

    ctx.reply("🛠️ Венера в тучах. Попробуй позже.");
  });
};


// const { Markup } = require("telegraf");
// const axios = require("axios");
// const logger = require("../../../logger");
// const MODELS = require("../../../models");
// const pending = require("../../pendingStore");

// module.exports = (bot, flow) => {
//   const feature = "love";
//   const label = "анализ любви и отношений";

//   /* ── кнопка меню ─────────────────────────────────────────────── */
//   bot.action("love_start", async (ctx) => {
//     await ctx.answerCbQuery();
//     flow.set(ctx.from.id, feature);

//     pending.set(ctx.from.id, {
//       label,
//       ask: `✨ Оплата подтверждена!

// Пришли *данные чётко 4-мя строками* (нумерация обязательна):

// 1) 📅  Дата ⏰ Время  
// 2) 🗺  Город рождения  
// 3) 💖 Семейное положение (свободна, замужем …)  
// 4) ❓ Что волнует (1-2 фразы)

// Пример:
// 1) 01.01.2000 10:00
// 2) Москва
// 3) Встречаюсь
// 4) Почему повторяются конфликты?`,
//     });

//     for (const model of MODELS) {
//       try {
//         const { data } = await axios.post(/* … */);

//         /* чистим лишний жир — две звёздочки справа и слева */
//         const answer = (data.choices?.[0]?.message?.content || "")
//           .replace(/\*\*/g, "") // <-- здесь
//           .trim();

//         await ctx.reply(answer);
//         logger.info(`[love] ok ${model} ${Date.now() - t0}мс`);
//         sent = true;
//         break;
//       } catch (e) {
//         /* … */
//       }
//     }

//     ctx.reply(
//       `💳 Для получения *${label}* переведи 50 ₽ на карту:\n` +
//         "2200 7009 7760 7737\n\nЗатем пришли чек 👇",
//       { parse_mode: "Markdown" }
//     );
//   });

//   /* ── regexp четырёх нумерованных строк ───────────────────────── */
//   const loveReg =
//     /^\s*1\)\s*(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})\s*\n\s*2\)\s*(.+?)\s*\n\s*3\)\s*(.+?)\s*\n\s*4\)\s*([\s\S]+)$/i;

//   const SYSTEM_MSG =
//     "Ты мягкий астролог-коуч. Дай 5 нумерованных блоков, каждый ≤3 строки, " +
//     "весь ответ ≤1200 сим, дружелюбный русский, можно эмодзи. " +
//     "Запрещено прогнозировать болезни, смерть и давать финансовые советы.";

//   /* ── анализ любви ────────────────────────────────────────────── */
//   bot.hears(loveReg, async (ctx) => {
//     if (flow.get(ctx.from.id) !== feature) return;

//     const [, dateTime, city, status, question] =
//       ctx.message.text.match(loveReg);
//     const tag = ctx.from.username || ctx.from.id;
//     const t0 = Date.now();
//     logger.info(`[love] запрос @${tag}`);

//     await ctx.reply("💌 Читаю любовные линии…");

//     const userPrompt = `Сделай *анализ любви и отношений* ровно по 5 блокам:

// 1. ❤️ Личная любовь-энергия  
// 2. 💞 Эмоции / выражение чувств  
// 3. 💍 Партнёрский потенциал  
// 4. ⚠️ Точки роста / проблемы  
// 5. ✨ Совет на ближайший год  

// Дано:  
// • Дата/время — ${dateTime}  
// • Город — ${city}  
// • Статус — ${status}  
// • Вопрос — ${question.trim()}`;

//     let sent = false;
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
//         if (!answer) throw new Error("empty answer");

//         await ctx.reply(answer);
//         logger.info(`[love] ok ${model} ${Date.now() - t0}мс`);
//         sent = true;
//         break;
//       } catch (e) {
//         logger.warn(
//           `[love] FAIL ${model} | ${e.response?.status || e.code} ${e.message}`
//         );
//       }
//     }

//     if (!sent) ctx.reply("🛠️ Венера в тучах. Попробуй позже.");

//     /* сбрасываем состояния только ПОСЛЕ обработки */
//     pending.delete(ctx.from.id);
//     flow.delete(ctx.from.id);
//   });
// };

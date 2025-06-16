const createFeature = require("./featureFactory");

module.exports = (bot, flow) =>
  createFeature(bot, flow, {
    key: "love",
    buttonId: "love_start",
    label: "анализ любви и отношений",
    price: 50,

    waitText: "💌 Читаю любовные линии…",
    hintText:
      "❗ Три строки:\n1) 📅 Дата ⏰ Время 🗺 Город\n2) 💖 Статус\n3) ❓ Вопрос",
    askText:
      "✨ Оплата подтверждена!\n\n" +
      "Для *анализа любви и отношений* пришли:\n" +
      "1) 📅 Дата ⏰ Время 🗺 Город\n" +
      "2) 💖 Семейное положение\n" +
      "3) ❓ Что волнует\n\n" +
      "Пример:\n1) 01.01.2000 10:00 Москва\n2) встречаюсь\n3) конфликты в отношениях?",

    regExp:
      /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*(?:\r?\n|\r)\s*(?:2\)\s*)?(.+?)\s*(?:\r?\n|\r)\s*(?:3\)\s*)?(.+)$/,

    sysMsg:
      "Отвечай 5 блоками: личная энергия, эмоции, потенциал, проблемы, совет. ≤1200 символов.",

    buildPrompt: ([, birth, status, what]) =>
      `
Сделай анализ любви и отношений по 5 блокам:

1. ❤️ Личная любовь-энергия  
2. 💞 Эмоции / выражение чувств  
3. 💍 Партнёрский потенциал  
4. ⚠️ Точки роста / проблемы  
5. ✨ Совет на ближайший год  

Дата рождения: ${birth.trim()}  
Семейное положение: ${status.trim()}  
Что волнует: ${what.trim()}`.trim(),
  });

// const { Markup } = require("telegraf");
// const axios = require("axios");
// const logger = require("../../../logger");
// const MODELS = require("../../../models");
// const pending = require("../../pendingStore");

// const feature = "love";

// module.exports = (bot, flow) => {
//   const label = "анализ любви и отношений";

//   bot.action("love_start", async (ctx) => {
//     await ctx.answerCbQuery();
//     flow.set(ctx.from.id, feature);

//     pending.set(ctx.from.id, {
//       label,
//       ask:
//         "✨ Оплата подтверждена!\n\n" +
//         "Для *анализа любви и отношений* пришли тремя строками:\n" +
//         "1) 📅 Дата рождения ⏰ Время 🗺 Город\n" +
//         "2) 💖 Семейное положение (свободна, замужем и т.д.)\n" +
//         "3) ❓ Что волнует (1-2 фразы)\n" +
//         "Пример:\n" +
//         "1) 01.01.2000 10:00 Москва\n" +
//         "2) встречаюсь\n" +
//         "3) конфликты в отношениях?",
//     });

//     await ctx.reply(
//       `💳 Для получения *${label}* переведи 50 ₽ на карту:\n` +
//         "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
//       { parse_mode: "Markdown" }
//     );
//   });

//   const loveReg =
//     /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*(?:\r?\n|\r)\s*(?:2\)\s*)?(.+?)\s*(?:\r?\n|\r)\s*(?:3\)\s*)?(.+)$/;

//   // Исправлено: синхронный обработчик вместо асинхронного
//   bot.hears(
//     (text, ctx) => flow.get(ctx.from.id) === feature && loveReg.test(text),
//     async (ctx) => {
//       const match = ctx.message.text.match(loveReg);
//       if (!match) {
//         logger.warn("[love] Регулярное выражение не сработало");
//         return;
//       }

//       const [, birth, status, concern] = match;
//       const t0 = Date.now();
//       const tag = ctx.from.username || ctx.from.id;
//       logger.info(`[love] запрос @${tag}`);

//       await ctx.reply("💌 Читаю любовные линии…");

//       const userPrompt = `Сделай анализ любви и отношений по 5 блокам:

// 1. ❤️ Личная любовь-энергия
// 2. 💞 Эмоции / выражение чувств
// 3. 💍 Партнёрский потенциал
// 4. ⚠️ Точки роста / проблемы
// 5. ✨ Совет на ближайший год

// Дата рождения: ${birth.trim()}
// Семейное положение: ${status.trim()}
// Что волнует: ${concern.trim()}`;

//       for (const model of MODELS) {
//         try {
//           const { data } = await axios.post(
//             "https://openrouter.ai/api/v1/chat/completions",
//             {
//               model,
//               messages: [
//                 {
//                   role: "system",
//                   content:
//                     "Ты мягкий астролог-коуч. Отвечай строго 5 блоками: 1. Личная любовь-энергия, 2. Эмоции/выражение чувств, 3. Партнёрский потенциал, 4. Точки роста/проблемы, 5. Совет на ближайший год. " +
//                     "Не используй символы «#» в начале блоков, ≤1200 символов, тёплый русский, эмодзи приветствуются. Учитывай, что сейчас 2025 год. " +
//                     "Запрещено прогнозировать смерть, болезни и давать финансовые советы.",
//                 },
//                 { role: "user", content: userPrompt },
//               ],
//             },
//             {
//               headers: {
//                 Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//                 "Content-Type": "application/json",
//               },
//             }
//           );

//           const answer = (data.choices?.[0]?.message?.content || "").trim();
//           await ctx.reply(
//             answer || "🌌 Космос молчит.",
//             Markup.inlineKeyboard([
//               [Markup.button.callback("Назад ◀️", "back_to_menu")],
//             ])
//           );

//           logger.info(`[love] ok ${model} ${Date.now() - t0}мс`);
//           pending.delete(ctx.from.id);
//           flow.delete(ctx.from.id);
//           return;
//         } catch (e) {
//           logger.warn(`[love] FAIL ${model} | ${e.code || e.response?.status}`);
//         }
//       }

//       await ctx.reply(
//         "🛠️ Венера в тучах. Попробуй позже.",
//         Markup.inlineKeyboard([
//           [Markup.button.callback("Назад ◀️", "back_to_menu")],
//         ])
//       );
//       pending.delete(ctx.from.id);
//       flow.delete(ctx.from.id);
//     }
//   );

//   /* --- найдите в love.js блок с bot.on("message") и замените его целиком --- */
//   bot.on("message", async (ctx, next) => {
//     if (flow.get(ctx.from.id) === feature) {
//       await ctx.reply(
//         "❗ Пожалуйста, пришли данные ровно в трёх строках:\n" +
//           "1) 📅 Дата рождения ⏰ Время 🗺 Город\n" +
//           "2) 💖 Семейное положение (1–2 слова)\n" +
//           "3) ❓ Что волнует (1–2 фразы)\n\n" +
//           "Пример:\n" +
//           "1) 01.01.2000 10:00 Москва\n" +
//           "2) встречаюсь\n" +
//           "3) конфликты в отношениях?",
//         Markup.inlineKeyboard([
//           [Markup.button.callback("Назад ◀️", "back_to_menu")],
//         ])
//       );
//       // остаёмся в режиме love, next не нужен
//       return;
//     }
//     /* если режим другой — отдаём управление дальше */
//     return next();
//   });
// };

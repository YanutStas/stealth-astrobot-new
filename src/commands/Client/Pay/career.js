const createFeature = require("./featureFactory");

module.exports = (bot, flow) =>
  createFeature(bot, flow, {
    /* ── метаданные ─────────────────────────── */
    key: "career",
    buttonId: "career_start",
    label: "карьерный прогноз",
    price: 50,

    /* ── клиентские тексты ───────────────────── */
    waitText: "📈 Читаю карьерные линии…",
    hintText:
      "❗ Пришли данные ровно в трёх строках:\n" +
      "1) 📅 Дата ⏰ Время 🗺 Город\n" +
      "2) 💼 Сфера / должность\n" +
      "3) 🎯 Главный вопрос (1–2 фразы)",
    askText:
      "✨ Оплата подтверждена!\n\n" +
      "Для *карьерного прогноза* пришли одним сообщением:\n" +
      "1) 📅 Дата ⏰ Время 🗺 Город\n" +
      "2) 💼 Текущая сфера / должность\n" +
      "3) 🎯 Главный карьерный вопрос (1–2 фразы)\n\n" +
      "Пример:\n" +
      "1) 12.09.1998 09:30 Смоленск\n" +
      "2) Маркетолог\n" +
      "3) Куда расти дальше?",

    /* ── формат входа ────────────────────────── */
    regExp:
      /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*(?:\r?\n|\r)\s*(?:2\)\s*)?(.+?)\s*(?:\r?\n|\r)\s*(?:3\)\s*)?(.+)$/,

    /* ── system-prompt (добавится к COMMON_SYS) ─ */
    sysMsg:
      "Отвечай ровно 5 блоками: 1. Сильные стороны, 2. Риски и выгорание, " +
      "3. Поток денег и источники, 4. Рекомендованные форматы, " +
      "5. Важные периоды на ближайший год. " +
      "Без эзотерики, смертельных прогнозов и символов «#». ≤1200 символов.",

    /* ── генерация user-prompt ───────────────── */
    buildPrompt: ([, birth, prof, ask]) =>
      `
Составь карьерный прогноз по 5 блокам:

1. 🏆 Сильные стороны  
2. ⚠️ Риски и выгорание  
3. 💰 Поток денег и лучшие источники дохода  
4. 🚀 Рекомендованные форматы (офис / фриланс / бизнес)  
5. 📅 Важные периоды на ближайший год  

Дата рождения: ${birth.trim()}  
Сфера / должность: ${prof.trim()}  
Карьерный вопрос: ${ask.trim()}`.trim(),
  });

// /*  src/commands/Client/Pay/career.js  */
// const { Markup } = require("telegraf");
// const axios = require("axios");
// const logger = require("../../../logger");
// const MODELS = require("../../../models");
// const pending = require("../../pendingStore");

// const feature = "career"; // ← ключ в Map flow
// const label = "карьерный прогноз"; // ← текст для клиента

// module.exports = (bot, flow) => {
//   /*──────────────── КНОПКА «Карьерный прогноз» ────────────────*/

//   bot.on("text", (ctx, next) => {
//     const txt = ctx.message.text.replace(/\n/g, "\\n");
//     const mode = flow.get(ctx.from.id) || "-";
//     logger.info(`[DBG] flow=${mode}  text="${txt.slice(0, 80)}"`);
//     next(); // передаём управление дальше
//   });

//   bot.action("career_start", async (ctx) => {
//     await ctx.answerCbQuery();
//     flow.set(ctx.from.id, feature);

//     pending.set(ctx.from.id, {
//       label,
//       ask:
//         "✨ Оплата подтверждена!\n\n" +
//         "Для *карьерного прогноза* пришли одним сообщением:\n" +
//         "1) 📅 Дата рождения ⏰ Время 🗺 Город\n" +
//         "2) 💼 Текущая сфера / должность\n" +
//         "3) 🎯 Главный карьерный вопрос (1-2 фразы)\n\n" +
//         "Пример:\n" +
//         "1) 12.09.1998 09:30 Смоленск\n" +
//         "2) Маркетолог\n" +
//         "3) Куда расти дальше?",
//     });

//     await ctx.reply(
//       `💳 Для получения *${label}* переведи 50 ₽ на карту:\n` +
//         "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
//       { parse_mode: "Markdown" }
//     );
//   });

//   /*──────────────── 3-строчный ввод клиента ───────────────────*/
//   const careerReg =
//     /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*(?:\r?\n|\r)\s*(?:2\)\s*)?(.+?)\s*(?:\r?\n|\r)\s*(?:3\)\s*)?(.+)$/;

//   /* Cистемное сообщение для модели */
//   const SYSTEM_MSG =
//     "Ты практичный HR-астролог. Отвечай ровно 5 блоками: " +
//     "1. Сильные стороны, 2. Риски и выгорание, 3. Поток денег и источники, " +
//     "4. Рекомендованные форматы, 5. Важные периоды на ближайший год. " +
//     "≤1200 символов, дружелюбный русский, эмодзи можно. 2025 год на дворе.";

//   /*──────────────── ОСНОВНОЙ ОБРАБОТЧИК ───────────────────────*/
//   bot.hears(
//     (text, ctx) => flow.get(ctx.from.id) === feature && careerReg.test(text),
//     async (ctx) => {
//       const m = ctx.message.text.match(careerReg);
//       if (!m) {
//         logger.warn("[career] regex miss");
//         return;
//       }
//       const [, birth, profession, question] = m;

//       const tag = ctx.from.username || ctx.from.id;
//       logger.info(`[career] запрос @${tag}`);
//       await ctx.reply("📈 Читаю карьерные линии…");

//       const userPrompt = `Составь карьерный прогноз по 5 блокам:

// 1. 🏆 Сильные стороны
// 2. ⚠️ Риски и выгорание
// 3. 💰 Поток денег и лучшие источники дохода
// 4. 🚀 Рекомендованные форматы (офис/фриланс/бизнес)
// 5. 📅 Важные периоды на ближайший год

// Дата рождения: ${birth.trim()}
// Сфера / должность: ${profession.trim()}
// Карьерный вопрос: ${question.trim()}`;

//       for (const model of MODELS) {
//         try {
//           const { data } = await axios.post(
//             "https://openrouter.ai/api/v1/chat/completions",
//             {
//               model,
//               messages: [
//                 { role: "system", content: SYSTEM_MSG },
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

//           logger.info(`[career] ok ${model}`);
//           pending.delete(ctx.from.id);
//           flow.delete(ctx.from.id);
//           return;
//         } catch (e) {
//           logger.warn(
//             `[career] FAIL ${model} | ${e.code || e.response?.status}`
//           );
//         }
//       }

//       await ctx.reply(
//         "🛠️ Сатурн ушёл в отпуск. Попробуй позже.",
//         Markup.inlineKeyboard([
//           [Markup.button.callback("Назад ◀️", "back_to_menu")],
//         ])
//       );
//       // запись в pending оставляем – вдруг пришлёт повторно
//     }
//   );

//   /*──────────────── Подсказка, если формат неверный ───────────*/
//   bot.on("message", async (ctx) => {
//     if (flow.get(ctx.from.id) === feature) {
//       await ctx.reply(
//         "❗ Пришли данные ровно в трёх строках:\n" +
//           "1) 📅 Дата ⏰ Время 🗺 Город\n" +
//           "2) 💼 Сфера / должность\n" +
//           "3) 🎯 Главный вопрос (1-2 фразы)",
//         Markup.inlineKeyboard([
//           [Markup.button.callback("Назад ◀️", "back_to_menu")],
//         ])
//       );
//     }
//   });
// };

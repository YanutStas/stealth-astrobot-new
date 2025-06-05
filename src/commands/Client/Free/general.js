// src/commands/Client/Free/general.js

const axios = require("axios");
const { DateTime } = require("luxon");
const { Markup } = require("telegraf");
const logger = require("../../../logger");
const MODELS = require("../../../models");

// РЕГУЛЯРКА для одной карты (натальной)
const natalReg = /^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+$/;
const isValid = (t) =>
  natalReg.test(t.trim()) &&
  DateTime.fromFormat(t.split(/\s+/).slice(0, 2).join(" "), "dd.MM.yyyy HH:mm")
    .isValid;

// ampersand нужен только для платного “совместимость”
const dualReg = /&/;

module.exports = (bot, flow) => {
  /* ── Кнопка «Общая (бесплатно)» ─────────────────────────────── */
  bot.action("general_start", async (ctx) => {
    await ctx.answerCbQuery();
    // переводим пользователя в режим “general”
    flow.set(ctx.from.id, "general");

    await ctx.reply(
      "Чтобы я составил твою *натальную карту*, пришли данные так:\n\n" +
        "📅 ДД.MM.ГГГГ   ⏰ ЧЧ:ММ   🗺 Город\n\n" +
        "Пример: 01.01.2000 10:00 Москва",
      { parse_mode: "Markdown" }
    );
  });

  /* ── Обработчик: если flow === "general" и текст валидный и без '&' ── */
  bot.hears(
    async (txt, ctx) =>
      flow.get(ctx.from.id) === "general" && // ОБЯЗАТЕЛЬНАЯ проверка режима
      isValid(txt) &&
      !dualReg.test(txt),
    async (ctx) => {
      const t0 = Date.now();
      const tag = ctx.from.username || ctx.from.id;
      logger.info(`[free] запрос @${tag}`);

      await ctx.reply("🔭 Сканирую звёзды…");

      const prompt = `Сделай краткий дружелюбный отчёт (≤1200 сим) по 7 пунктам:
1. ☀️ Солнце — характер  
2. 🌙 Луна — эмоции  
3. 🡱 Асцендент — внешнее «я»  
4. 🔎 Опыт и знания  
5. 🎨 Таланты и хобби  
6. 🧘 Здоровье и ресурс  
7. 🌀 Внутренний конфликт  

—
✨ В итоге: (1-2 предложения)

*Запрещено* упоминать любовь / отношения, деньги / карьеру и совместимость.  
Только русский, можно эмодзи.  
Дата рождения: ${ctx.message.text.trim()}`;

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
                    "Ты дружелюбный астролог-практик. Пиши строго 7 пунктами и итогом, ≤1200 символов, русский язык, можно эмодзи. Никаких ссылок и рекламы.",
                },
                { role: "user", content: prompt },
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
            `[free] ▼PROMPT(${model})\n${prompt}\n▲ANSWER(first400)\n${answer.slice(
              0,
              400
            )}…`
          );

          // Отправляем пользователю + добавляем призыв к платным разделам
          await ctx.reply(
            (answer || "🌌 Космос молчит.") +
              "\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
            { parse_mode: "Markdown" }
          );
          logger.info(`[free] ok ${model} ${Date.now() - t0} мс`);

          // СБРАСЫВАЕМ режим “general” ( больше не слушаем рандомный текст )
          flow.delete(ctx.from.id);
          return;
        } catch (e) {
          logger.warn(
            `[free] FAIL ${model} | ${e.code || e.response?.status} ${
              e.message
            }`
          );
          // если модель не отвечает – переходим к следующей
        }
      }

      // Если все модели “упали”:
      await ctx.reply(
        "🛠️ Космос молчит. Попробуй позже.\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
        { parse_mode: "Markdown" }
      );
      flow.delete(ctx.from.id);
    }
  );
};

// /*  src/commands/Client/Free/general.js  */
// const axios = require("axios");
// const { DateTime } = require("luxon");
// const { Markup } = require("telegraf");
// const logger = require("../../../logger");
// const MODELS = require("../../../models");

// /* ── валидация одной карты ───────────────────────────────────────── */
// const natalReg = /^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+$/;
// const isValid = (t) =>
//   natalReg.test(t.trim()) &&
//   DateTime.fromFormat(t.split(/\s+/).slice(0, 2).join(" "), "dd.MM.yyyy HH:mm")
//     .isValid;

// /* ampersand нужен только для платной «совместимости», поэтому
//    если он есть — бесплатный обработчик обязан отказаться */
// const dualReg = /&/;

// /* системка для всех моделей */
// const SYSTEM_MSG =
//   "Ты дружелюбный астролог-практик. Пиши строго 7 пунктами и итогом, ≤1200 символов, " +
//   "русский язык, можно эмодзи. Категории «любовь/деньги/совместимость» запрещены.";

// /* ────────────────────────────────────────────────────────────────── */
// module.exports = (bot) => {
//   /* кнопка «Общая (бесплатно)» */
//   bot.action("general_start", async (ctx) => {
//     await ctx.answerCbQuery();
//     ctx.reply(
//       "Чтобы я составил твою *натальную карту*, пришли данные так:\n\n" +
//         "📅 ДД.MM.ГГГГ   ⏰ ЧЧ:ММ   🗺 Город\n\n" +
//         "Пример: 01.01.2000 10:00 Москва",
//       { parse_mode: "Markdown" }
//     );
//   });

//   /* сам обработчик */
//   bot.hears(
//     async (txt) => isValid(txt) && !dualReg.test(txt), // ← если есть «&», уходим
//     async (ctx) => {
//       const t0 = Date.now();
//       const tag = ctx.from.username || ctx.from.id;
//       logger.info(`[free] запрос @${tag}`);

//       await ctx.reply("🔭 Сканирую звёзды…");

//       const prompt = `Сделай краткий дружелюбный отчёт (≤1200 сим) по 7 пунктам:
// 1. ☀️ Солнце — характер
// 2. 🌙 Луна — эмоции
// 3. 🡱 Асцендент — внешнее «я»
// 4. 🔎 Опыт и знания
// 5. 🎨 Таланты и хобби
// 6. 🧘 Здоровье и ресурс
// 7. 🌀 Внутренний конфликт

// —
// ✨ В итоге: (1-2 предложения)

// *Запрещено* упоминать любовь / отношения, деньги / карьеру и совместимость.
// Только русский, можно эмодзи.
// Дата рождения: ${ctx.message.text.trim()}`;

//       for (const model of MODELS) {
//         try {
//           const { data } = await axios.post(
//             "https://openrouter.ai/api/v1/chat/completions",
//             {
//               model,
//               messages: [
//                 { role: "system", content: SYSTEM_MSG },
//                 { role: "user", content: prompt },
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

//           /* DEBUG: пишем prompt + 1-ю часть ответа, чтобы видно было,
//              какой обработчик реально сработал */
//           logger.debug(
//             `[free] ▼PROMPT(${model})\n${prompt}\n` +
//               `▲ANSWER(first400)\n${answer.slice(0, 400)}…`
//           );

//           await ctx.reply(
//             (answer || "🌌 Космос молчит.") +
//               "\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
//             { parse_mode: "Markdown" }
//           );
//           logger.info(`[free] ok ${model} ${Date.now() - t0} мс`);
//           return;
//         } catch (e) {
//           logger.warn(
//             `[free] FAIL ${model} | ${e.code || e.response?.status} ${
//               e.message
//             }`
//           );
//         }
//       }

//       ctx.reply("🛠️ Космос молчит. Попробуй позже.");
//     }
//   );
// };

// src/commands/Client/Free/horoscope.js

const axios = require("axios");
const { DateTime } = require("luxon");
const { Markup } = require("telegraf");
const logger = require("../../../logger");
const MODELS = require("../../../models");

// Список знаков зодиака (12 штук)
const SIGNS = [
  "Овен",
  "Телец",
  "Близнецы",
  "Рак",
  "Лев",
  "Дева",
  "Весы",
  "Скорпион",
  "Стрелец",
  "Козерог",
  "Водолей",
  "Рыбы",
];

module.exports = (bot, flow) => {
  /* ── Кнопка «Гороскоп (бесплатно)» ───────────────────────────────── */
  bot.action("horoscope_start", async (ctx) => {
    await ctx.answerCbQuery();

    // Переходим в режим “horoscope”
    flow.set(ctx.from.id, "horoscope");

    await ctx.reply(
      "✨ Выберите, пожалуйста, ваш солнечный знак, и я дам краткий прогноз:\n\n",
      Markup.inlineKeyboard(
        SIGNS.map((sign) => [
          Markup.button.callback(sign, `horoscope_sign_${sign}`),
        ])
      )
    );
  });

  /* ── Обработка выбора знака (через action) ───────────────────────────────── */
  SIGNS.forEach((sign) => {
    bot.action(`horoscope_sign_${sign}`, async (ctx) => {
      // Если пользователь не в режиме “horoscope” – игнорируем
      if (flow.get(ctx.from.id) !== "horoscope") {
        return;
      }

      await ctx.answerCbQuery();
      const t0 = Date.now();
      const tag = ctx.from.username || ctx.from.id;

      logger.info(`[horoscope] запрос @${tag} (знак: ${sign})`);
      await ctx.reply("🔮 Составляю краткий прогноз…");

      // Текущая дата
      const today = DateTime.local().toFormat("dd.MM.yyyy");
      const userPrompt = `Дай, пожалуйста, краткий гороскоп на неделю для знака «${sign}», 
учти, что сегодня ${today}.  
Ответ раздели на два коротких блока (каждый блок — 1–2 коротких абзаца, максимум 500 символов):
1. Общие тенденции  
2. Здоровье  

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
            `[horoscope] ▼PROMPT(${model})\n${userPrompt}\n▲ANSWER(first300)\n${answer.slice(
              0,
              300
            )}…`
          );

          await ctx.reply(
            (answer || "🌌 Прогноз пока недоступен. Попробуйте позже.") +
              "\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
            { parse_mode: "Markdown" }
          );
          logger.info(`[horoscope] ok ${model} ${Date.now() - t0}мс`);

          // После ответа выходим из режима “horoscope”
          flow.delete(ctx.from.id);
          return;
        } catch (e) {
          logger.warn(
            `[horoscope] FAIL ${model} | ${e.response?.status || e.code}`
          );
        }
      }

      // Если ни один запрос не отработал:
      await ctx.reply(
        "🛠️ Планеты заняты. Попробуйте позже.\n\n💎 *Хочешь узнать о любви, деньгах или совместимости?* Нажми соответствующую платную кнопку!",
        { parse_mode: "Markdown" }
      );
      flow.delete(ctx.from.id);
    });
  });
};

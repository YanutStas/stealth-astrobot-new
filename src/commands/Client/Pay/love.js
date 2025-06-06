const { Markup } = require("telegraf");
const axios = require("axios");
const logger = require("../../../logger");
const MODELS = require("../../../models");
const pending = require("../../pendingStore");

// feature-флаг для режима «любовь»
const feature = "love";

module.exports = (bot, flow) => {
  const label = "анализ любви и отношений";

  // 1) Обработчик кнопки «💕 Любовь (платно)»
  bot.action("love_start", async (ctx) => {
    await ctx.answerCbQuery();
    // Включаем режим «love»
    flow.set(ctx.from.id, feature);

    // Сохраняем «pending» требование чек + дальнейший ввод
    pending.set(ctx.from.id, {
      label,
      ask:
        "✨ Оплата подтверждена!\n\n" +
        "Для *анализа любви и отношений* пришли тремя строками:\n" +
        "1) 📅 Дата рождения ⏰ Время 🗺 Город\n" +
        "2) 💖 Семейное положение (свободна, замужем и т.д.)\n" +
        "3) ❓ Что волнует (1-2 фразы)\n" +
        "Пример:\n" +
        "1) 01.01.2000 10:00 Москва\n" +
        "2) встречаюсь\n" +
        "3) конфликты в отношениях?",
    });

    await ctx.reply(
      `💳 Для получения *${label}* переведи 50 ₽ на карту:\n` +
        "2200 7009 7760 7737\n\nЗатем пришли скриншот чека 👇",
      { parse_mode: "Markdown" }
    );
  });

  // 2) Регулярка: три строки (дата/время/город — семейное положение — что волнует)
  const loveReg =
    /^\s*(?:1\)\s*)?(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+?)\s*(?:\r?\n|\r)\s*(?:2\)\s*)?(.+?)\s*(?:\r?\n|\r)\s*(?:3\)\s*)?(.+)$/;

  // 3) Основной обработчик: если пользователь в режиме «love» и текст подходит под loveReg
  bot.hears(async (txt, ctx) => {
    return flow.get(ctx.from.id) === feature && loveReg.test(ctx.message.text);
  }, async (ctx) => {
    // Забираем группы из регулярки
    const [, birth, status, concern] = ctx.message.text.match(loveReg);

    const t0 = Date.now();
    const tag = ctx.from.username || ctx.from.id;
    logger.info(`[love] запрос @${tag}`);

    await ctx.reply("💌 Читаю любовные линии…");

    // Собираем пользовательский промпт
    const userPrompt = `Сделай анализ любви и отношений по 5 блокам:

1. ❤️ Личная любовь-энергия  
2. 💞 Эмоции / выражение чувств  
3. 💍 Партнёрский потенциал  
4. ⚠️ Точки роста / проблемы  
5. ✨ Совет на ближайший год  

Дата рождения: ${birth.trim()}  
Семейное положение: ${status.trim()}  
Что волнует: ${concern.trim()}`;

    // Пробуем все модели по очереди
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
                  "Ты мягкий астролог-коуч. Отвечай строго 5 блоками: 1. Личная любовь-энергия, 2. Эмоции/выражение чувств, 3. Партнёрский потенциал, 4. Точки роста/проблемы, 5. Совет на ближайший год. " +
                  "Не используй символы «#» в начале блоков, ≤1200 символов, тёплый русский, эмодзи приветствуются. Учитывай, что сейчас 2025 год. " +
                  "Запрещено прогнозировать смерть, болезни и давать финансовые советы.",
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

        // Берём ответ от GPT
        const answer = (data.choices?.[0]?.message?.content || "").trim();

        // Отправляем пользователю + показываем только кнопку «Назад ◀️»
        await ctx.reply(
          answer || "🌌 Космос молчит.",
          Markup.inlineKeyboard([[Markup.button.callback("Назад ◀️", "back_to_menu")]])
        );

        logger.info(`[love] ok ${model} ${Date.now() - t0}мс`);

        // Сбрасываем режим «love» и pending
        pending.delete(ctx.from.id);
        flow.delete(ctx.from.id);
        return;
      } catch (e) {
        logger.warn(`[love] FAIL ${model} | ${e.code || e.response?.status}`);
      }
    }

    // Если все модели упали
    await ctx.reply(
      "🛠️ Венера в тучах. Попробуй позже.",
      Markup.inlineKeyboard([[Markup.button.callback("Назад ◀️", "back_to_menu")]])
    );
    pending.delete(ctx.from.id);
    flow.delete(ctx.from.id);
  });

  // 4) Если пользователь в режиме «love», но отправил что-то, что не подходит под регэксп
  bot.on("message", async (ctx) => {
    if (flow.get(ctx.from.id) === feature) {
      // Просто напомним формат и сбросим режим
      await ctx.reply(
        "❗ Пожалуйста, пришли данные ровно в трёх строках:\n" +
          "1) 📅 Дата рождения ⏰ Время 🗺 Город\n" +
          "2) 💖 Семейное положение (1–2 слова)\n" +
          "3) ❓ Что волнует (1–2 фразы)\n\n" +
          "Пример:\n" +
          "1) 01.01.2000 10:00 Москва\n" +
          "2) встречаюсь\n" +
          "3) конфликты в отношениях?",
        Markup.inlineKeyboard([[Markup.button.callback("Назад ◀️", "back_to_menu")]])
      );
      flow.delete(ctx.from.id);
      pending.delete(ctx.from.id);
    }
  });
};
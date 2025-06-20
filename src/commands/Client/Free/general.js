const { Markup } = require("telegraf");
const { DateTime } = require("luxon");
const { drawNatalChart } = require("../../../utils/astroChart");
const { runFreeLLM } = require("./freeFactory");

/* ── валидация ввода ─────────────────────────────── */
const natalRx = /^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+$/;
const ampersand = /&/;
const okInput = (t) =>
  natalRx.test(t.trim()) &&
  DateTime.fromFormat(t.split(/\s+/).slice(0, 2).join(" "), "dd.MM.yyyy HH:mm")
    .isValid;

/* ── кнопка меню ─────────────────────────────────── */
module.exports = (bot) => {
  bot.action("general_start", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply(
      `Чтобы я составил твою *натальную карту*, пришли данные так:

📅 ДД.MM.ГГГГ   ⏰ ЧЧ:ММ   🗺 Город

Пример: 01.01.2000 10:00 Москва`,
      { parse_mode: "Markdown" }
    );
  });

  /* ── основной обработчик ───────────────────────── */
  bot.hears(
    (t) => okInput(t) && !ampersand.test(t),
    async (ctx) => {
      const uid = ctx.from.id;
      const input = ctx.message.text.trim();

      await ctx.reply("🔭 Сканирую звёзды и рисую карту… (до 1-2 мин)");
      ctx.telegram.sendChatAction(ctx.chat.id, "upload_photo");

      /* ----- PNG ----- */
      let png;
      try {
        png = drawNatalChart(uid, input);
      } catch {
        png = null;
      }

      /* ----- отчёт ----- */
      const prompt = `Сделай дружелюбный отчёт (≤900 симв.) по 7 пунктам:
1. Солнце — характер
2. Луна — эмоции
3. Асцендент — внешнее «я»
4. Опыт и знания
5. Таланты и хобби
6. Здоровье и ресурс
7. Внутренний конфликт

—
Итог: 1 предложение
Дата: ${input}
Запрещено: любовь, деньги, совместимость.`;

      let answer =
        (await runFreeLLM(ctx, {
          prompt,
          sysMsg: "Пиши по пунктам, дружелюбно, с эмодзи. ≤900 символов.",
          featTag: "general",
          send: false,
        })) || "🌌 Космос молчит.";

      const footer =
        "—\n🔓 Полный доступ к *любви, карьере и совместимости* — в платных функциях 👇";
      const kb = Markup.inlineKeyboard([
        [Markup.button.callback("Назад ◀️", "back_to_menu")],
      ]);

      /* гарантируем, что caption ≤ 1000 */
      const fullCaption = `${answer}\n\n${footer}`;
      let captionToSend = fullCaption;
      if (captionToSend.length > 1000) {
        captionToSend = fullCaption.slice(0, 997) + "…";
      }

      /* ----- отправка ----- */
      if (png) {
        await ctx.replyWithPhoto(
          { source: png },
          {
            caption: captionToSend,
            parse_mode: "Markdown",
            reply_markup: kb.reply_markup,
          }
        );
      } else {
        await ctx.reply(fullCaption, {
          parse_mode: "Markdown",
          reply_markup: kb.reply_markup,
        });
      }
    }
  );
};

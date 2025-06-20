const { Markup } = require("telegraf");
const { DateTime } = require("luxon");
const { drawNatalChart } = require("../../../utils/astroChart");
const { runFreeLLM } = require("./freeFactory");

/* ── валидация ── */
const reInput = /^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+$/;
const isOk = (t) =>
  reInput.test(t.trim()) &&
  DateTime.fromFormat(t.split(/\s+/).slice(0, 2).join(" "), "dd.MM.yyyy HH:mm")
    .isValid;

module.exports = (bot) => {
  /* кнопка меню */
  bot.action("general_start", async (ctx) => {
    await ctx.answerCbQuery();
    ctx.reply(
      "Чтобы я составил твою *натальную карту*, пришли данные так:\n\n" +
        "📅 ДД.MM.ГГГГ   ⏰ ЧЧ:ММ   🗺 Город\n\n" +
        "Пример: 01.01.2000 10:00 Москва",
      { parse_mode: "Markdown" }
    );
  });

  /* основной обработчик */
  bot.hears(
    (t) => isOk(t),
    async (ctx) => {
      const uid = ctx.from.id;
      const input = ctx.message.text.trim();

      await ctx.reply("🔭 Сканирую звёзды и рисую карту… (до 1-2 мин)");
      ctx.telegram.sendChatAction(ctx.chat.id, "upload_photo");

      /* картинка */
      let img;
      try {
        img = drawNatalChart(uid, input);
      } catch (e) {
        console.error("Error generating chart:", e);
        await ctx.reply("⚠️ Ошибка генерации карты. Попробуйте позже.");
        return;
      }

      /* текст ≤900 симв. */
      const prompt =
        `Краткий отчёт (≤900 симв):\n` +
        `1. Солнце — характер\n2. Луна — эмоции\n3. Асцендент — внешнее «я»\n` +
        `4. Опыт и знания\n5. Таланты и хобби\n6. Здоровье и ресурс\n7. Внутренний конфликт\n\n` +
        `Итог: 1 предложение.\nЗапрещено: любовь, деньги, совместимость.\nДата: ${input}`;

      let txt =
        (await runFreeLLM(ctx, {
          prompt,
          sysMsg: "Пиши дружелюбно, с эмодзи, блоками.",
          featTag: "general",
          send: false,
        })) || "🌌 Космос молчит.";

      /* caption ограничен 1024 byte → коротим при необходимости */
      const footer =
        "\n\n—\n🔓 Полный доступ к *любви, карьере и совместимости* — в платных функциях 👇";
      const CAP_LIMIT = 1024;
      if ((txt + footer).length > CAP_LIMIT)
        txt = txt.slice(0, CAP_LIMIT - footer.length - 1) + "…";

      const kb = Markup.inlineKeyboard([
        [Markup.button.callback("Назад ◀️", "back_to_menu")],
      ]);

      try {
        await ctx.replyWithPhoto(
          { source: img },
          {
            caption: txt + footer,
            parse_mode: "Markdown",
            reply_markup: kb.reply_markup,
          }
        );
      } catch (e) {
        console.error("Error sending photo:", e);
        await ctx.reply("⚠️ Ошибка отправки карты. Попробуйте ещё раз.");
      }
    }
  );
};

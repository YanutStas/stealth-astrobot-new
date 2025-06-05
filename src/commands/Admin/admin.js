// src/commands/Admin/admin.js
const { DateTime } = require("luxon");
const { Markup } = require("telegraf");
const logger = require("../../logger");
const pending = require("../pendingStore");

const ADMIN_ID = process.env.ADMIN_ID;

/* ---------- чек от клиента ---------- */
module.exports = (bot) => {
  bot.on(["photo", "document"], async (ctx) => {
    const uid = ctx.from.id;
    const entry = pending.get(uid);
    const label = entry?.label || "неизвестная услуга";

    /* клиенту */
    await ctx.reply("📩 Чек принят! Открою доступ после подтверждения.");

    /* админу: пересылаем чек … */
    await ctx.forwardMessage(ADMIN_ID);

    /* … и сразу подпись + кнопки */
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `🧾 Оплата за ${label} от @${ctx.from.username || uid} (ID: ${uid})`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✔️ Подтвердить", `grant_ok_${uid}`),
          Markup.button.callback("✖️ Отклонить", `grant_no_${uid}`),
        ],
      ])
    );
  });

  /* ---------- ПОДТВЕРЖДЕНИЕ ---------- */
  bot.action(/^grant_ok_(\d+)$/, async (ctx) => {
    const uid = +ctx.match[1];
    const entry = pending.get(uid);
    const label = entry?.label || "ваша услуга";
    const ask = entry?.ask || "Оплата прошла!";

    await ctx.answerCbQuery("Оплата подтверждена ✔️");

    /* лог */
    logger.info(
      `[${DateTime.local().toFormat(
        "dd.MM.yyyy HH:mm:ss"
      )}]: ✅ Оплата подтверждена для @${uid}`
    );

    /* клиенту — персональная инструкция */
    await bot.telegram.sendMessage(uid, ask, { parse_mode: "Markdown" });

    /* админу */
    await ctx.editMessageText(`✅ Оплата за «${label}» подтверждена.`);
    pending.delete(uid); // удаляем ТОЛЬКО при успехе
  });

  /* ---------- ОТКЛОНЕНИЕ ---------- */
  bot.action(/^grant_no_(\d+)$/, async (ctx) => {
    const uid = +ctx.match[1];
    const entry = pending.get(uid);
    const label = entry?.label || "услуга";

    await ctx.answerCbQuery("Оплата отклонена");

    logger.info(
      `[${DateTime.local().toFormat(
        "dd.MM.yyyy HH:mm:ss"
      )}]: ❌ Оплата отклонена для @${uid}`
    );

    await bot.telegram.sendMessage(
      uid,
      "😔 Платёж не найден. Проверь реквизиты и пришли корректный чек — и мы продолжим!"
    );

    await ctx.editMessageText(`❌ Оплата за «${label}» отклонена.`);
    /* ⚠️ оставляем запись в pending — чтобы повторный чек «помнил» услугу */
  });
};

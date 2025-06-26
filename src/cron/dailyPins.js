/*  -----------------------------------------------------------
    🌠  «Совет дня»  – ежедневный пин-месседж
   ----------------------------------------------------------- */

const cron = require("node-cron");
const { DateTime } = require("luxon");
const Redis = require("ioredis");
const { runFreeLLM } = require("../commands/Client/Free/freeFactory");

const redis = new Redis(process.env.REDIS_URL);

module.exports = (bot) => {
  /*  Расписание: 20-я минута 14-го часа, каждый день  */
  cron.schedule("20 14 * * *", async () => {
    const subs = await redis.smembers("daily_subs");
    if (!subs.length) return;

    const niceDate = DateTime.local().toFormat("dd LLLL"); // «26 июня»
    const prompt = `Дай очень короткий (до 200 символов) астросовет на ${niceDate}.`;

    const tip =
      (await runFreeLLM(null, {
        prompt,
        sysMsg: "Коротко и по делу, без пунктов.",
        featTag: "daily",
        send: false, // нужен только текст
      })) || "✨ Новый день — новые возможности!";

    for (const uid of subs) {
      try {
        const { message_id } = await bot.telegram.sendMessage(
          uid,
          `🌠 *Совет дня*\n${tip}`,
          { parse_mode: "Markdown" }
        );
        await bot.telegram.pinChatMessage(uid, message_id, {
          disable_notification: true,
        });
      } catch (e) {
        /* бот заблокирован / чат удалён → отписываем */
        if (String(e.code).startsWith("4")) await redis.srem("daily_subs", uid);
      }
    }
  });
};

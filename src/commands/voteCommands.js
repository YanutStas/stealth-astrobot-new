const { Markup } = require("telegraf");
const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

const ADMIN_CHAT_ID = Number(process.env.ADMIN_ID);

/* Список будущих функций для голосования */
const FEATURES = [
  {
    id: "D",
    emoji: "🎫",
    title: "Реферальная программа",
    short: "бонусы за друзей",
  },
  { id: "E", emoji: "🗓️", title: "Астро-календарь", short: "луна, ретрограды" },
  {
    id: "F",
    emoji: "🔮",
    title: "Таро / Нумерология",
    short: "быстрые расклады",
  },
  {
    id: "G",
    emoji: "📊",
    title: "Личный кабинет",
    short: "сохранение профилей",
  },
  { id: "H", emoji: "🌍", title: "English version", short: "i18n & Stars" },
];

/* просто экранируем Markdown V2 (чтобы можно было использовать при желании) */
const esc = (s) => s.replace(/[\\_*[\]()~`>#+\-=|{}.!]/g, "\\$&");

module.exports = (bot, sendMainMenu) => {
  /* ───────── меню голосования ───────── */
  bot.action("vote_menu", async (ctx) => {
    await ctx.answerCbQuery();
    const rows = FEATURES.map((f) => [
      Markup.button.callback(`${f.emoji} ${f.title}`, `vote_${f.id}`),
    ]);

    await ctx.reply(
      `*🗳 Голос за будущую фичу*  
Нажми, что хотелось бы увидеть первым:`,
      { parse_mode: "Markdown", ...Markup.inlineKeyboard(rows) }
    );
  });

  /* ───────── обработка голоса ───────── */
  bot.action(/^vote_([A-Z])$/, async (ctx) => {
    const featId = ctx.match[1];
    const feat = FEATURES.find((f) => f.id === featId);
    if (!feat) return ctx.answerCbQuery();

    const uid = ctx.from.id.toString();
    const voteKey = `votes:${featId}`;

    /* один пользователь = один голос */
    if (await redis.sismember(voteKey, uid)) {
      await ctx.answerCbQuery("Уже голосовали 👍", { show_alert: false });
      return;
    }
    await redis.sadd(voteKey, uid);
    const total = await redis.scard(voteKey);

    /* пользователю */
    await ctx.answerCbQuery("✅ Голос учтён!", { show_alert: false });
    sendMainMenu(ctx); // возвращаем главное меню

    /* админу (чистый текст — без Markdown => никаких экранирований) */
    const adminNote = `🗳 Новый голос → ${feat.emoji} ${feat.title}
От: ${ctx.from.username || "—"}  (ID ${uid})
Всего по фиче: ${total}`;
    await bot.telegram.sendMessage(ADMIN_CHAT_ID, adminNote);
  });
};

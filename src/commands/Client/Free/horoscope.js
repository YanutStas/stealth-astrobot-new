// 📁 src/commands/Client/Free/horoscope.js
const { Markup }  = require('telegraf');
const { runFreeLLM } = require('./freeFactory');           // наш helper

/* ── список знаков и ключей для callback ── */
const SIGNS = [
  { key: 'aries',       ru: 'Овен'       },
  { key: 'taurus',      ru: 'Телец'      },
  { key: 'gemini',      ru: 'Близнецы'   },
  { key: 'cancer',      ru: 'Рак'        },
  { key: 'leo',         ru: 'Лев'        },
  { key: 'virgo',       ru: 'Дева'       },
  { key: 'libra',       ru: 'Весы'       },
  { key: 'scorpio',     ru: 'Скорпион'   },
  { key: 'sagittarius', ru: 'Стрелец'    },
  { key: 'capricorn',   ru: 'Козерог'    },
  { key: 'aquarius',    ru: 'Водолей'    },
  { key: 'pisces',      ru: 'Рыбы'       },
];

module.exports = (bot, flow) => {
  /* ── первый клик «Гороскоп на неделю» ── */
  bot.action('horoscope_start', async (ctx) => {
    await ctx.answerCbQuery();
    const rows = SIGNS.map(s => [Markup.button.callback(s.ru, `hz_${s.key}`)]);
    await ctx.reply('🔎 Выбери свой знак зодиака 👇',
      Markup.inlineKeyboard(rows));
  });

  /* ── обработчики по каждому знаку ── */
  SIGNS.forEach(({ key, ru }) => {
    bot.action(`hz_${key}`, async (ctx) => {
      await ctx.answerCbQuery(`Готовлю прогноз для «${ru}»`);

      const prompt =
        `Составь короткий (до 900 симв.) 7-дневный гороскоп для знака ` +
        `${ru}. Дай 2 небольших абзаца: «Общие тенденции» и «Совет дня».`;

      const answer = await runFreeLLM(ctx, {
        prompt,
        sysMsg : 'Структура: заголовки с эмодзи, без даты, без ссылок.',
        featTag: 'weekly',
        waitText: '🔮 Составляю прогноз…',
        send: false,                 // вернём текст, потом обогащаем кнопкой
      });

      await ctx.reply(
        answer || '🌌 Космос молчит.',
        Markup.inlineKeyboard([
          [Markup.button.callback('Назад ◀️', 'back_to_menu')],
        ]),
      );
    });
  });
};
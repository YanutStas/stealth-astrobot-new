/*  src/commands/Client/Free/general.js  */
const { DateTime } = require("luxon");
const createFeature = require("./freeFactory");

/* валидация ввода */
const natalReg = /^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+.+$/;
const isValid = (txt) =>
  natalReg.test(txt.trim()) &&
  DateTime.fromFormat(
    txt.split(/\s+/).slice(0, 2).join(" "),
    "dd.MM.yyyy HH:mm"
  ).isValid;

/* системка только для данной фичи */
const SYS_MSG =
  "Пиши строго 7 пунктами + итогом. Запрещено упоминать любовь, деньги и совместимость.";

/* — экспорт для index.js — */
module.exports = (bot, flow) =>
  createFeature(bot, flow, {
    buttonId: "general_start",

    askText:
      "Чтобы я составил *натальную карту*, пришли данные одной строкой:\n\n" +
      "📅 ДД.MM.ГГГГ   ⏰ ЧЧ:ММ   🗺 Город\n\n" +
      "Пример: 01.01.2000 10:00 Москва",

    waitText: "🔭 Сканирую звёзды…",

    regExp: natalReg,

    validate: ([txt]) => isValid(txt),

    sysMsg: SYS_MSG,

    buildPrompt: ([full]) =>
      `
Сделай краткий дружелюбный отчёт (≤1200 сим) по 7 пунктам:

1. ☀️ Солнце — характер
2. 🌙 Луна — эмоции
3. 🡱 Асцендент — внешнее «я»
4. 🔎 Опыт и знания
5. 🎨 Таланты и хобби
6. 🧘 Здоровье и ресурс
7. 🌀 Внутренний конфликт

—
✨ В итоге: (1–2 предложения)

Дата рождения: ${full.trim()}`.trim(),
  });

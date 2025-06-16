const pino = require("pino");
const { DateTime } = require("luxon");

const isDev = process.env.NODE_ENV !== "production";

/* русские ярлыки уровней */
const LEVEL_RU = {
  trace: "ТРЕЙС",
  debug: "ОТЛАДКА",
  info: "ИНФО",
  warn: "ВНИМАНИЕ",
  error: "ОШИБКА",
  fatal: "ФАТАЛ",
};

/* тайм-стамп сразу в зоне Europe/Moscow */
function moscowTime() {
  return `"time":"${DateTime.utc()
    .setZone("Europe/Moscow")
    .toFormat("dd.MM.yyyy HH:mm:ss")}"`;
}

module.exports = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),

  timestamp: moscowTime,

  /* подмена уровня на русский */
  formatters: {
    level(label) {
      return { level: LEVEL_RU[label] || label.toUpperCase() };
    },
  },

  /* dev-вывод — красивый; prod — чистый JSON */
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
          messageFormat: "{level} • {feat:-} • {uid:-} • {msg}",
          ignore: "pid,hostname,prompt", // никаких лишних хвостов
        },
      }
    : undefined,
});

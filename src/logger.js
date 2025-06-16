const pino = require("pino");

const isDev = process.env.NODE_ENV !== "production";

module.exports = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          translateTime: "dd.MM.yyyy HH:mm:ss",
          ignore: "pid,hostname",
          colorize: true,
        },
      }
    : undefined,
});

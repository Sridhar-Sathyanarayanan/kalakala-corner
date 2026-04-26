import { createLogger, format, transports } from "winston";

const { combine, timestamp, errors, json, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json(),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        logFormat
      )
    })
  ],
  exceptionHandlers: [
    new transports.Console({
      format: logFormat
    })
  ],
  rejectionHandlers: [
    new transports.Console({
      format: logFormat
    })
  ]
});

// Handle unhandled errors globally
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection:", reason);
});

export default logger;


import { createLogger, format, transports } from "winston";

const { combine, timestamp, errors, json, printf } = format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json(),
    logFormat
  ),
  transports: [new transports.Console()],
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

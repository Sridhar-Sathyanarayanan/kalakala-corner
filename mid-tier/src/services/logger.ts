// src/logger.ts
import { createLogger, format, transports } from "winston";

const { combine, timestamp, errors, json, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp(),
    errors({ stack: true }),
    process.env.NODE_ENV === "production" ? json() : colorize({ all: true }),
    process.env.NODE_ENV === "production" ? json() : logFormat
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

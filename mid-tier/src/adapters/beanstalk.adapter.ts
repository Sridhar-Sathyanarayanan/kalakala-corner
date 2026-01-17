/**
 * Elastic Beanstalk Adapter
 * 
 * Entry point for Elastic Beanstalk deployment
 * Runs Express server directly (no serverless-http wrapper)
 * 
 * Environment variables:
 * - PORT: Server port (default: 5000)
 * - NODE_ENV: development|production
 * - ENVIRONMENT: dev|staging|production
 * 
 * Deployment:
 * - package.json main: "dist/adapters/beanstalk.adapter.js"
 * - package.json start: "node dist/adapters/beanstalk.adapter.js"
 */

import "dotenv/config";
import { createExpressApp } from "./express.adapter";
import logger from "../services/logger";

/**
 * Start Beanstalk server
 * Listens on 0.0.0.0 (required for Beanstalk)
 */
function startServer() {
  const app = createExpressApp();
  const PORT = parseInt(process.env.PORT || "5000", 10);
  const HOST = "0.0.0.0"; // Required for Beanstalk to map traffic

  const server = app.listen(PORT, HOST, () => {
    logger.info("=".repeat(60));
    logger.info("Elastic Beanstalk Server Started");
    logger.info("=".repeat(60));
    logger.info(`Host: ${HOST}`);
    logger.info(`Port: ${PORT}`);
    logger.info(`Environment: ${process.env.ENVIRONMENT || "development"}`);
    logger.info(`Node Env: ${process.env.NODE_ENV || "development"}`);
    logger.info(`Region: ${process.env.AWS_REGION || "us-east-1"}`);
    logger.info("=".repeat(60));
    logger.info("Ready to accept requests");
    logger.info("=".repeat(60));
  });

  /**
   * Graceful shutdown on SIGTERM
   * AWS Beanstalk sends SIGTERM before stopping the instance
   */
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after 30 seconds");
      process.exit(1);
    }, 30000);
  });

  /**
   * Graceful shutdown on SIGINT (Ctrl+C)
   */
  process.on("SIGINT", () => {
    logger.info("SIGINT signal received: closing HTTP server");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  });

  /**
   * Handle uncaught exceptions
   */
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception:", error);
    // Don't exit - Beanstalk will restart
  });

  /**
   * Handle unhandled promise rejections
   */
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit - Beanstalk will restart
  });

  return server;
}

// Start server
startServer();

export {}; // This is a script file, not a module

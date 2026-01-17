/**
 * Express Server Entry Point
 * Development and production server for Beanstalk deployment
 * 
 * For local development:
 *   npm run start:dev
 * 
 * For production on Beanstalk:
 *   npm run start
 */

import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import logger from "./services/logger";

// Load environment variables
if (process.env.ENVIRONMENT !== "production") {
  require("dotenv").config();
}

// Import routes
import productRoutes from "./features/products/routes";
import loginRoutes from "./features/login/routes";
import customerEnquiryRoutes from "./features/enquiries/routes";
import testimonialsRoutes from "./features/testimonials/routes";

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: process.env.ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Middleware stack
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Request logging (morgan → winston)
app.use(
  morgan("tiny", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || "dev",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Kalakala Corner API",
    version: "1.0.0",
    environment: process.env.ENVIRONMENT || "dev",
  });
});

// Mount routes
app.use(productRoutes);
app.use(loginRoutes);
app.use(customerEnquiryRoutes);
app.use(testimonialsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: Request,
    res: Response,
    next: (err?: any) => void
  ) => {
    logger.error("Unhandled error:", err);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      statusCode,
      error: {
        code: err.code || "INTERNAL_SERVER_ERROR",
        message,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

// Start server
const server = app.listen(port, () => {
  logger.info(`🚀 Server running at http://localhost:${port}`);
  logger.info(`📝 Environment: ${process.env.ENVIRONMENT || "dev"}`);
  logger.info(`📊 Health check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

export default app;

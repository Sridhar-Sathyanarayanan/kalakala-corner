/**
 * Express Adapter
 * 
 * Creates an Express application that works for both:
 * 1. Direct Express deployment (Beanstalk)
 * 2. Lambda via serverless-http wrapper
 * 3. Local development with nodemon
 * 
 * This eliminates route duplication and provides a single source of truth
 * for all HTTP endpoint configuration.
 */

import express, { Express, Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import logger from "../services/logger";
import { getConfig } from "../lambda/core/config";

// Import routes
import productRoutes from "../features/products/routes";
import loginRoutes from "../features/login/routes";
import customerEnquiryRoutes from "../features/enquiries/routes";
import testimonialsRoutes from "../features/testimonials/routes";

/**
 * Create Express application with unified routing
 * 
 * This function is called by:
 * - server.ts (for Beanstalk / local development)
 * - lambda-handler.ts (for AWS Lambda)
 */
export function createExpressApp(): Express {
  const app = express();

  // ============= MIDDLEWARE SETUP =============
  
  // CORS configuration - Must be applied BEFORE routes
  const corsOptions = {
    origin: [
      "https://www.kalakalacorner.com",
      "https://kalakalacorner.com"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token", "X-Requested-With"],
    exposedHeaders: ["X-Request-ID", "Content-Type"],
    maxAge: 86400, // 24 hours
  };
  
  // Apply CORS globally
  app.use(cors(corsOptions));
  
  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  app.use(cookieParser());

  // Request ID middleware for tracing
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (req as any).requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
  });

  // ============= HEALTH & ROOT ENDPOINTS =============

  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId,
      environment: process.env.ENVIRONMENT || "dev",
    });
  });

  app.get("/", (req: Request, res: Response) => {
    res.json({
      message: "Kalakala Corner API",
      version: "1.0.0",
      environment: process.env.ENVIRONMENT || "dev",
      requestId: (req as any).requestId,
    });
  });

  // ============= API ROUTES =============
  
  // Mount all route modules
  // Routes handle their own middleware (auth, etc.)
  app.use(productRoutes);
  app.use(loginRoutes);
  app.use(customerEnquiryRoutes);
  app.use(testimonialsRoutes);

  // ============= ERROR HANDLERS =============

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
      requestId: (req as any).requestId,
    });
  });

  // Global error handler (must be last)
  app.use(
    (
      err: any,
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      logger.error(
        `[${(req as any).requestId}] Unhandled error: ${err.message}`,
        err
      );

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
        requestId: (req as any).requestId,
      });
    }
  );

  return app;
}

/**
 * Export app instance
 * Used by serverless-http in lambda-handler.ts
 */
export const app = createExpressApp();

/**
 * Unified Middleware Layer
 * Works for both Express and Lambda via adapters
 * Single source of truth for all middleware logic
 */

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import logger from "../services/logger";

/**
 * Extended Express Request with auth data
 */
export interface AuthRequest extends Request {
  user?: JwtPayload | string;
  userId?: string;
  token?: string;
  requestId?: string;
}

/**
 * Request ID middleware
 * Generates unique ID for request tracking (works on both platforms)
 */
export const requestIdMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader("X-Request-ID", req.requestId);
  logger.info(`[${req.requestId}] ${req.method} ${req.path}`);
  next();
};

/**
 */
export const extractToken = (req: AuthRequest): string | null => {
  // Try Authorization header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader) {
    const parts = (authHeader as string).split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      return parts[1];
    }
  }

  // Try cookies
  const cookies = req.headers.cookie || "";
  const match = cookies.match(/auth_token=([^;]+)/);
  if (match) {
    return match[1];
  }

  // Try from cookies object if available
  if ((req as any).cookies?.auth_token) {
    return (req as any).cookies.auth_token;
  }

  return null;
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret) {
    throw new Error("ADMIN_TOKEN not configured");
  }

  return jwt.verify(token, secret) as JwtPayload;
};

/**
 * Unified Admin Verification Middleware
 * Works for both Express and Lambda
 */
export const adminAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.warn(
        `[${req.requestId || "unknown"}] Unauthorized - no token provided`
      );
      res.status(401).json({
        success: false,
        statusCode: 401,
        error: {
          code: "UNAUTHORIZED",
          message: "No token provided",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    req.token = token;
    if (decoded.userId) {
      req.userId = decoded.userId as string;
    }

    logger.info(
      `[${req.requestId || "unknown"}] Admin token verified for user: ${decoded.username || decoded.sub}`
    );
    next();
  } catch (error: any) {
    logger.warn(
      `[${req.requestId || "unknown"}] Invalid token: ${error.message}`
    );
    res.status(403).json({
      success: false,
      statusCode: 403,
      error: {
        code: "FORBIDDEN",
        message: "Invalid or expired token",
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * For backward compatibility with existing code
 */
export const verifyAdmin = adminAuthMiddleware;

/**
 * Authentication middleware
 * Requires valid JWT token
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    logger.warn(`[${req.requestId}] Unauthorized - no token`);
    return res.status(401).json({
      success: false,
      statusCode: 401,
      error: {
        code: "UNAUTHORIZED",
        message: "No token provided",
      },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    req.userId = user.sub as string;
    next();
  } catch (error) {
    logger.warn(`[${req.requestId}] Unauthorized - invalid token`, error);
    return res.status(401).json({
      success: false,
      statusCode: 401,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Admin middleware
 * Requires user with admin role
 */
export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // First check if authenticated
  if (!req.user) {
    return authMiddleware(req, res, () => {
      // Check admin role
      const user = req.user as any;
      if (user && user.role === "admin") {
        next();
      } else {
        logger.warn(`[${req.requestId}] Forbidden - not admin`);
        return res.status(403).json({
          success: false,
          statusCode: 403,
          error: {
            code: "FORBIDDEN",
            message: "Admin access required",
          },
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  const user = req.user as any;
  if (user && user.role === "admin") {
    next();
  } else {
    logger.warn(`[${req.requestId}] Forbidden - not admin`);
    return res.status(403).json({
      success: false,
      statusCode: 403,
      error: {
        code: "FORBIDDEN",
        message: "Admin access required",
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Request logging middleware
 * Log all requests with timing
 */
export const loggingMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const duration = Date.now() - startTime;
    logger.info(`[${req.requestId}] ${res.statusCode} - ${duration}ms`);
    return originalJson(data);
  };

  next();
};

/**
 * Error handling middleware
 * Catches errors from controllers/services
 */
export const errorHandler = (
  err: any,
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  logger.error(`[${req.requestId}] Error:`, err);

  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const message = err.message || "Internal server error";
  const details = process.env.ENVIRONMENT === "dev" ? { stack: err.stack } : undefined;

  res.status(statusCode).json({
    success: false,
    statusCode,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * CORS preflight middleware
 */
export const corsPreflightMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(200);
  }
  next();
};

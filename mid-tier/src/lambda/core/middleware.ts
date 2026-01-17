import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ResponseBuilder } from "./response-builder";
import { getConfig } from "./config";
import { AuthenticationError, AuthorizationError } from "./errors";
import logger from "../../services/logger";

/**
 * Handler context with common utilities
 */
export interface HandlerContext {
  event: APIGatewayProxyEvent;
  response: ResponseBuilder;
  requestId: string;
  userId?: string;
  user?: JwtPayload | string;
}

/**
 * Handler type definition
 */
export type LambdaHandler<T = any> = (context: HandlerContext) => Promise<APIGatewayProxyResult | T>;

/**
 * Middleware for handler execution
 */
export type Middleware = (
  context: HandlerContext,
  next: () => Promise<APIGatewayProxyResult>
) => Promise<APIGatewayProxyResult>;

/**
 * Extract token from event (Authorization header or cookies)
 */
export const extractToken = (event: APIGatewayProxyEvent): string | null => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      return parts[1];
    }
  }

  const cookies = event.headers?.Cookie || event.headers?.cookie || "";
  const authTokenMatch = cookies.match(/auth_token=([^;]+)/);
  if (authTokenMatch && authTokenMatch[1]) {
    return authTokenMatch[1];
  }

  return null;
};

/**
 * Verify JWT token and extract user info
 */
export const verifyToken = (token: string): JwtPayload => {
  const config = getConfig();
  try {
    return jwt.verify(token, config.adminTokenSecret) as JwtPayload;
  } catch (error) {
    logger.error("Token verification failed", error);
    throw new AuthenticationError("Invalid or expired token");
  }
};

/**
 * Middleware: Require authentication
 */
export const requireAuth: Middleware = async (context, next) => {
  const token = extractToken(context.event);

  if (!token) {
    logger.warn(`Unauthorized access attempt - Request ID: ${context.requestId}`);
    return context.response.unauthorized("No token provided");
  }

  try {
    const user = verifyToken(token);
    context.user = user;
    context.userId = user.sub as string;
    return await next();
  } catch (error) {
    return context.response.unauthorized("Invalid or expired token");
  }
};

/**
 * Middleware: Check admin role
 */
export const requireAdmin: Middleware = async (context, next) => {
  if (!context.user) {
    return context.response.unauthorized("No token provided");
  }

  const user = context.user as any;
  if (user.role !== "admin") {
    logger.warn(`Unauthorized admin access attempt - User: ${context.userId}`);
    return context.response.forbidden("Admin access required");
  }

  return await next();
};

/**
 * Middleware: Parse and validate JSON body
 */
export const parseJsonBody = (schema?: any): Middleware => {
  return async (context, next) => {
    try {
      if (context.event.body) {
        context.event.body = JSON.parse(
          typeof context.event.body === "string"
            ? context.event.body
            : JSON.stringify(context.event.body)
        );
      } else {
        context.event.body = "{}";
      }

      // Simple schema validation if provided
      if (schema && typeof schema.validate === "function") {
        const { error, value } = schema.validate(context.event.body);
        if (error) {
          const errors: Record<string, string[]> = {};
          error.details.forEach((detail: any) => {
            const fieldKey = detail.path.join(".");
            if (!errors[fieldKey]) {
              errors[fieldKey] = [];
            }
            errors[fieldKey].push(detail.message);
          });
          return context.response.validationError(errors, "Validation failed");
        }
        context.event.body = value;
      }

      return await next();
    } catch (error: any) {
      logger.error("JSON parse error", error);
      return context.response.validationError(
        { body: "Invalid JSON" },
        "Request body must be valid JSON"
      );
    }
  };
};

/**
 * Middleware: Request logging
 */
export const logRequest: Middleware = async (context, next) => {
  const startTime = Date.now();
  const method = context.event.httpMethod || "UNKNOWN";
  const path = context.event.path || (context.event as any).rawPath || "/";

  logger.info(`[${context.requestId}] ${method} ${path}`);

  const response = await next();
  const duration = Date.now() - startTime;

  logger.info(`[${context.requestId}] ${response.statusCode} - ${duration}ms`);

  return response;
};

/**
 * Middleware: Error handling
 */
export const errorHandler: Middleware = async (context, next) => {
  try {
    return await next();
  } catch (error: any) {
    logger.error(`[${context.requestId}] Unhandled error`, error);

    // Check for known error types
    if (error.statusCode && error.code) {
      return context.response.error(error.code, error.message, error.statusCode, error.details);
    }

    // Generic error handling
    const message = getConfig().enableDetailedErrors
      ? error.message || "Internal server error"
      : "Internal server error";

    return context.response.internalServerError(
      message,
      getConfig().enableDetailedErrors ? { stack: error.stack } : undefined
    );
  }
};

/**
 * Middleware: CORS preflight
 */
export const corsPreflightHandler: Middleware = async (context, next) => {
  if (context.event.httpMethod === "OPTIONS") {
    return context.response.ok("OK");
  }
  return await next();
};

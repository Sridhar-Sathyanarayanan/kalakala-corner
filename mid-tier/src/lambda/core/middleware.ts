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
  // Debug: log all headers
  console.log("[extractToken] Headers:", JSON.stringify(event.headers, null, 2));

  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      console.log("[extractToken] Found Bearer token in Authorization header");
      return parts[1];
    }
  }

  // Check for auth_token in cookies
  const cookies = event.headers?.Cookie || event.headers?.cookie || "";
  console.log("[extractToken] Cookie header value:", cookies);
  
  const tokenMatch = cookies.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (tokenMatch && tokenMatch[1]) {
    console.log("[extractToken] Found auth_token in cookies");
    return tokenMatch[1];
  }

  console.log("[extractToken] No token found");
  return null;
};

/**
 * Verify JWT token and extract user info
 */
export const verifyToken = (token: string): JwtPayload => {
  const config = getConfig();
  console.log("[verifyToken] Token to verify:", token.substring(0, 50) + "...");
  console.log("[verifyToken] Secret length:", config.adminTokenSecret?.length);
  console.log("[verifyToken] Secret first 5 chars:", config.adminTokenSecret?.substring(0, 5));
  
  try {
    const decoded = jwt.verify(token, config.adminTokenSecret) as JwtPayload;
    console.log("[verifyToken] Token verified successfully:", JSON.stringify(decoded));
    return decoded;
  } catch (error: any) {
    console.log("[verifyToken] Verification failed:", error?.message);
    logger.error("Token verification failed", error);
    throw new AuthenticationError("Invalid or expired token");
  }
};

/**
 * Middleware: Require authentication
 */
export const requireAuth: Middleware = async (context, next) => {
  console.log(`[requireAuth] ========== AUTH CHECK START ==========`);
  console.log(`[requireAuth] Request ID: ${context.requestId}`);
  console.log(`[requireAuth] Path: ${context.event.path}`);
  
  const token = extractToken(context.event);
  console.log(`[requireAuth] Token extracted: ${token ? 'YES (length: ' + token.length + ')' : 'NO'}`);

  if (!token) {
    console.log(`[requireAuth] FAIL - No token provided`);
    logger.warn(`Unauthorized access attempt - Request ID: ${context.requestId}`);
    return context.response.unauthorized("No token provided");
  }

  try {
    console.log(`[requireAuth] Calling verifyToken...`);
    const user = verifyToken(token);
    console.log(`[requireAuth] Token verified! User: ${JSON.stringify(user)}`);
    context.user = user;
    context.userId = user.sub as string;
    console.log(`[requireAuth] SUCCESS - Calling next middleware`);
    return await next();
  } catch (error: any) {
    console.log(`[requireAuth] FAIL - Token verification error: ${error?.message}`);
    return context.response.unauthorized("Invalid or expired token");
  }
};

/**
 * Middleware: Check admin role
 * Since this is a single-admin system, any authenticated user is considered admin
 */
export const requireAdmin: Middleware = async (context, next) => {
  console.log(`[requireAdmin] ========== ADMIN CHECK START ==========`);
  console.log(`[requireAdmin] context.user: ${JSON.stringify(context.user)}`);
  
  if (!context.user) {
    console.log(`[requireAdmin] FAIL - No user in context`);
    return context.response.unauthorized("No token provided");
  }

  // In this single-admin system, if the token is valid, user is admin
  // The token was already verified by requireAuth middleware
  console.log(`[requireAdmin] SUCCESS - Admin access granted for user: ${(context.user as any).username}`);
  logger.info(`Admin access granted for user: ${(context.user as any).username}`);
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
 * Get allowed origins for CORS
 */
function getAllowedOrigins(): string[] {
  const envOrigin = process.env.ORIGIN || "";
  const origins = [envOrigin];
  
  // Support multiple origins: both with and without www
  if (envOrigin.includes("www.")) {
    origins.push(envOrigin.replace("www.", ""));
  }
  // If origin doesn't include www, also allow with www
  else if (envOrigin && !envOrigin.includes("//localhost") && !envOrigin.includes("//127.0.0.1")) {
    origins.push(envOrigin.replace("://", "://www."));
  }
  
  const filtered = origins.filter((o) => o);
  console.log(`[Middleware] getAllowedOrigins - Input: ${envOrigin}, Output: ${JSON.stringify(filtered)}`);
  return filtered;
}

/**
 * Get CORS origin header based on request origin
 */
function getCorsOrigin(requestOrigin?: string): string {
  console.log(`[Middleware] getCorsOrigin - Request Origin: ${requestOrigin}`);
  
  if (!requestOrigin) {
    const defaultOrigin = process.env.ORIGIN || "*";
    console.log(`[Middleware] getCorsOrigin - No request origin, returning default: ${defaultOrigin}`);
    return defaultOrigin;
  }
  
  const allowedOrigins = getAllowedOrigins();
  console.log(`[Middleware] getCorsOrigin - Allowed origins: ${JSON.stringify(allowedOrigins)}`);
  
  // Check if request origin matches any allowed origin
  const isAllowed = allowedOrigins.some((origin) => origin === requestOrigin);
  if (isAllowed) {
    console.log(`[Middleware] getCorsOrigin - Match found, returning: ${requestOrigin}`);
    return requestOrigin;
  }
  
  const defaultOrigin = process.env.ORIGIN || "*";
  console.log(`[Middleware] getCorsOrigin - No match, returning default: ${defaultOrigin}`);
  // Fallback to default origin or *
  return defaultOrigin;
}

/**
 * Middleware: CORS preflight
 */
export const corsPreflightHandler: Middleware = async (context, next) => {
  console.log(`[CORS Preflight] HTTP Method: ${context.event.httpMethod}`);
  console.log(`[CORS Preflight] Headers: ${JSON.stringify(context.event.headers)}`);
  
  if (context.event.httpMethod === "OPTIONS") {
    console.log(`[CORS Preflight] Processing OPTIONS request`);
    // Add CORS headers explicitly for preflight
    const response = context.response.ok("OK");
    const requestOrigin = context.event.headers?.Origin || context.event.headers?.origin;
    const corsOrigin = getCorsOrigin(requestOrigin);
    
    console.log(`[CORS Preflight] Request Origin: ${requestOrigin}, CORS Origin to return: ${corsOrigin}`);
    
    response.headers = {
      ...response.headers,
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Max-Age": "3600",
    };
    console.log(`[CORS Preflight] Returning response with headers: ${JSON.stringify(response.headers)}`);
    return response;
  }
  return await next();
};

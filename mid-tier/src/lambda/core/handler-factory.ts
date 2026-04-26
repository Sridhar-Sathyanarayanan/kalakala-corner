import { APIGatewayProxyEvent, APIGatewayProxyResult, Context as LambdaContext } from "aws-lambda";
import { ResponseBuilder } from "./response-builder";
import { Middleware, HandlerContext, LambdaHandler } from "./middleware";
import logger from "../../services/logger";

// Re-export for convenience
export type { HandlerContext, LambdaHandler, Middleware };

/**
 * Handler factory that wraps handlers with middleware chain
 */
export class HandlerFactory {
  /**
   * Create a handler with middleware chain
   */
  static create(
    handler: LambdaHandler,
    middlewares: Middleware[] = []
  ) {
    return async (
      event: APIGatewayProxyEvent,
      lambdaContext: LambdaContext
    ): Promise<APIGatewayProxyResult> => {
      const requestId = lambdaContext.awsRequestId || generateRequestId();
      
      // DEBUG: Log entry point
      console.log(`[HandlerFactory] ========== REQUEST START ==========`);
      console.log(`[HandlerFactory] Request ID: ${requestId}`);
      console.log(`[HandlerFactory] HTTP Method: ${event.httpMethod}`);
      console.log(`[HandlerFactory] Path: ${event.path}`);
      console.log(`[HandlerFactory] Resource: ${event.resource}`);
      console.log(`[HandlerFactory] Headers: ${JSON.stringify(event.headers, null, 2)}`);
      console.log(`[HandlerFactory] Middleware count: ${middlewares.length}`);
      console.log(`[HandlerFactory] Middlewares: ${middlewares.map(m => m.name || 'anonymous').join(', ')}`);
      
      const response = new ResponseBuilder(requestId, event);

      const context: HandlerContext = {
        event,
        response,
        requestId,
      };

      try {
        // Build middleware chain
        let chainIndex = 0;
        const executeNextMiddleware = async (): Promise<APIGatewayProxyResult> => {
          console.log(`[HandlerFactory] Executing middleware index: ${chainIndex}`);
          if (chainIndex >= middlewares.length) {
            // Execute actual handler
            console.log(`[HandlerFactory] All middleware passed, executing handler`);
            console.log(`[HandlerFactory] Context user: ${JSON.stringify(context.user)}`);
            const result = await handler(context);
            console.log(`[HandlerFactory] Handler returned, status: ${result?.statusCode}`);
            return result instanceof ResponseBuilder || (result && result.statusCode)
              ? result
              : response.success(result);
          }

          const middleware = middlewares[chainIndex++];
          const middlewareName = middleware.name || `middleware-${chainIndex}`;
          console.log(`[HandlerFactory] Running middleware: ${middlewareName}`);
          return middleware(context, executeNextMiddleware);
        };

        return await executeNextMiddleware();
      } catch (error: any) {
        logger.error(`[${requestId}] Unhandled exception in handler`, error);
        // Return error response with proper headers
        return response.internalServerError(
          error.message || "Internal server error"
        );
      }
    };
  }

  /**
   * Create a public handler (no auth required)
   */
  static createPublic(handler: LambdaHandler, middlewares: Middleware[] = []) {
    const { errorHandler, corsPreflightHandler, logRequest } = require("./middleware");
    return this.create(handler, [
      corsPreflightHandler,
      logRequest,
      errorHandler,
      ...middlewares,
    ]);
  }

  /**
   * Create an authenticated handler (requires valid token)
   */
  static createAuth(handler: LambdaHandler, middlewares: Middleware[] = []) {
    const { requireAuth, errorHandler, corsPreflightHandler, logRequest } = require("./middleware");
    return this.create(handler, [
      corsPreflightHandler,
      logRequest,
      errorHandler,
      requireAuth,
      ...middlewares,
    ]);
  }

  /**
   * Create an admin-only handler
   */
  static createAdmin(handler: LambdaHandler, middlewares: Middleware[] = []) {
    console.log(`[HandlerFactory.createAdmin] Setting up admin handler`);
    const { requireAuth, requireAdmin, errorHandler, corsPreflightHandler, logRequest } = require("./middleware");
    const adminMiddlewares = [
      corsPreflightHandler,
      logRequest,
      errorHandler,
      requireAuth,    // Extract and verify token first
      requireAdmin,   // Then check admin role
      ...middlewares,
    ];
    console.log(`[HandlerFactory.createAdmin] Middleware chain: corsPreflightHandler, logRequest, errorHandler, requireAuth, requireAdmin`);
    return this.create(handler, adminMiddlewares);
  }

  /**
   * Create a query handler (GET with validation)
   */
  static createQuery(handler: LambdaHandler, schema?: any) {
    const { errorHandler, corsPreflightHandler, logRequest } = require("./middleware");
    return this.create(handler, [
      corsPreflightHandler,
      logRequest,
      errorHandler,
    ]);
  }

  /**
   * Create a command handler (POST/PUT with body parsing)
   */
  static createCommand(handler: LambdaHandler, schema?: any, requiresAuth: boolean = false) {
    const { parseJsonBody, errorHandler, corsPreflightHandler, logRequest, requireAuth } = require("./middleware");
    const middlewares = [
      corsPreflightHandler,
      logRequest,
      errorHandler,
      parseJsonBody(schema),
    ];

    if (requiresAuth) {
      middlewares.push(requireAuth);
    }

    return this.create(handler, middlewares);
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper to get path parameter
 */
export const getPathParameter = (context: HandlerContext, paramName: string): string | undefined => {
  return context.event.pathParameters?.[paramName];
};

/**
 * Helper to get query parameter
 */
export const getQueryParameter = (context: HandlerContext, paramName: string): string | undefined => {
  return context.event.queryStringParameters?.[paramName];
};

/**
 * Helper to get all query parameters
 */
export const getQueryParameters = (context: HandlerContext): Record<string, string> => {
  const params = context.event.queryStringParameters || {};
  return Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Helper to get body
 */
export const getBody = (context: HandlerContext): any => {
  const body = context.event.body;
  const contentType = (context.event.headers?.['Content-Type'] || context.event.headers?.['content-type'] || '').toLowerCase();
  
  console.log(`[getBody] Content-Type: ${contentType}`);
  console.log(`[getBody] isBase64Encoded: ${context.event.isBase64Encoded}`);
  console.log(`[getBody] Body type: ${typeof body}`);
  console.log(`[getBody] Body preview: ${typeof body === 'string' ? body.substring(0, 200) : 'not a string'}`);
  
  if (!body) {
    console.log(`[getBody] No body, returning empty object`);
    return {};
  }
  
  // If body is already an object (parsed by middleware), return it
  if (typeof body === "object") {
    console.log(`[getBody] Body is already an object`);
    return body;
  }
  
  // If body is a string, check content type and parse accordingly
  if (typeof body === "string") {
    // Check if it's multipart/form-data - MUST check BEFORE trying to parse as JSON
    if (contentType.includes('multipart')) {
      console.log(`[getBody] Multipart form-data detected - returning raw body`);
      return { _isMultipart: true, _rawBody: body, _isBase64: context.event.isBase64Encoded };
    }
    
    // Check if it's URL-encoded form data
    if (contentType.includes('application/x-www-form-urlencoded')) {
      console.log(`[getBody] URL-encoded form data detected`);
      try {
        const params = new URLSearchParams(body);
        const result: Record<string, string> = {};
        params.forEach((value, key) => {
          result[key] = value;
        });
        return result;
      } catch (error) {
        console.error("[getBody] Failed to parse URL-encoded data", error);
        return {};
      }
    }
    
    // Only try to parse as JSON if it looks like JSON or content-type says it's JSON
    if (contentType.includes('application/json') || body.trim().startsWith('{') || body.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(body);
        console.log(`[getBody] Successfully parsed JSON`);
        return parsed;
      } catch (error) {
        console.error("[getBody] Failed to parse body as JSON", error);
        console.log(`[getBody] Body that failed to parse: ${body.substring(0, 500)}`);
        // Don't return empty object - return the raw body for debugging
        return { _parseError: true, _rawBody: body };
      }
    }
    
    // Unknown content type - return as-is
    console.log(`[getBody] Unknown content type, returning raw body`);
    return { _raw: true, _rawBody: body };
  }
  
  return {};
};

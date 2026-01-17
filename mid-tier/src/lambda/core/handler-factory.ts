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
      const response = new ResponseBuilder(requestId);

      const context: HandlerContext = {
        event,
        response,
        requestId,
      };

      try {
        // Build middleware chain
        let chainIndex = 0;
        const executeNextMiddleware = async (): Promise<APIGatewayProxyResult> => {
          if (chainIndex >= middlewares.length) {
            // Execute actual handler
            const result = await handler(context);
            return result instanceof ResponseBuilder || (result && result.statusCode)
              ? result
              : response.success(result);
          }

          const middleware = middlewares[chainIndex++];
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
    return this.create(handler, middlewares);
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
    const { requireAdmin, errorHandler, corsPreflightHandler, logRequest } = require("./middleware");
    return this.create(handler, [
      corsPreflightHandler,
      logRequest,
      errorHandler,
      requireAdmin,
      ...middlewares,
    ]);
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
  return context.event.body || {};
};

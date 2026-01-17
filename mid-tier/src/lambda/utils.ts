/**
 * Consolidated Lambda Utilities
 * All utility functions for Lambda handlers in one place
 * Includes auth helpers, event parsing, and response building
 */

import jwt, { JwtPayload } from "jsonwebtoken";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// ============================================================================
// AUTH HELPERS
// ============================================================================

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user?: JwtPayload | string;
}

/**
 * Verify admin token from event
 */
export const verifyAdminToken = (event: APIGatewayProxyEvent): { valid: boolean; user?: JwtPayload | string; error?: string } => {
  try {
    const token = extractToken(event);

    if (!token) {
      return {
        valid: false,
        error: "No token found",
      };
    }

    const user = jwt.verify(token, process.env.ADMIN_TOKEN as string) as JwtPayload;

    return {
      valid: true,
      user,
    };
  } catch (err) {
    return {
      valid: false,
      error: "Invalid or expired token",
    };
  }
};

/**
 * Extract token from Authorization header or cookies
 */
export const extractToken = (event: APIGatewayProxyEvent): string | null => {
  // Try Authorization header first
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      return parts[1];
    }
  }

  // Try cookies
  const cookies = event.headers?.Cookie || event.headers?.cookie || "";
  const authTokenMatch = cookies.match(/auth_token=([^;]+)/);
  if (authTokenMatch && authTokenMatch[1]) {
    return authTokenMatch[1];
  }

  return null;
};

// ============================================================================
// EVENT PARSING
// ============================================================================

/**
 * Parse JSON body from Lambda event
 */
export const parseBody = (event: APIGatewayProxyEvent): any => {
  if (!event.body) {
    return {};
  }

  if (typeof event.body === "string") {
    try {
      return JSON.parse(event.body);
    } catch (error) {
      return {};
    }
  }

  return event.body;
};

/**
 * Get path parameter from event
 */
export const getPathParameter = (event: APIGatewayProxyEvent, paramName: string): string | undefined => {
  return event.pathParameters?.[paramName];
};

/**
 * Get single query parameter from event
 */
export const getQueryParameter = (event: APIGatewayProxyEvent, paramName: string): string | undefined => {
  return event.queryStringParameters?.[paramName];
};

/**
 * Get all query parameters from event
 */
export const getAllQueryParameters = (event: APIGatewayProxyEvent): Record<string, string> => {
  if (!event.queryStringParameters) {
    return {};
  }
  // Filter out undefined values
  return Object.fromEntries(
    Object.entries(event.queryStringParameters).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;
};

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

export interface LambdaResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

/**
 * Build success response
 */
export const successResponse = (
  data: any,
  statusCode: number = 200
): APIGatewayProxyResult => {
  return {
    statusCode,
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.ORIGIN || "*",
      "Access-Control-Allow-Credentials": "true",
    },
  };
};

/**
 * Build error response
 */
export const errorResponse = (
  message: string,
  statusCode: number = 500
): APIGatewayProxyResult => {
  return {
    statusCode,
    body: JSON.stringify({ message }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.ORIGIN || "*",
      "Access-Control-Allow-Credentials": "true",
    },
  };
};

/**
 * Build validation error response
 */
export const validationErrorResponse = (errors: Record<string, string>): APIGatewayProxyResult => {
  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Validation failed", errors }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.ORIGIN || "*",
      "Access-Control-Allow-Credentials": "true",
    },
  };
};

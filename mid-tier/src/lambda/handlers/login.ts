/**
 * Consolidated Login Handlers
 * All authentication-related Lambda handlers in one file
 */

import { verifyPassword, checkLoggedIn } from "../../features/login/service";
import {
  HandlerFactory,
  getBody,
} from "../core/handler-factory";
import { HandlerContext } from "../core/middleware";
import { ValidationError } from "../core/errors";
import { extractToken } from "../core/middleware";

/**
 * Helper to build response matching Express format
 */
function buildItemsResponse(items: any, context: HandlerContext) {
  return {
    statusCode: 200,
    body: JSON.stringify({ ...items }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.ORIGIN || "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    },
  };
}

/**
 * Helper to build response for POST/PUT/DELETE matching Express format
 */
function buildDataResponse(
  statusCode: number,
  data: any,
  context: HandlerContext,
  message?: string,
  cookies?: string[]
) {
  const body: any = {
    statusCode,
    success: statusCode >= 200 && statusCode < 300,
    data,
  };

  if (message) {
    body.message = message;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.ORIGIN || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  };

  // Add Set-Cookie header directly if cookies provided
  if (cookies && cookies.length > 0) {
    headers["Set-Cookie"] = cookies[0];
  }

  return {
    statusCode,
    body: JSON.stringify(body),
    headers,
  };
}

/**
 * POST /api/login
 * Authenticate user and return JWT token
 */
export const login = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const body = getBody(context);
    const { username, password } = body;

    // Validate required fields
    const errors: Record<string, string[]> = {};
    if (!username) errors.username = ["Username is required"];
    if (!password) errors.password = ["Password is required"];

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Login validation failed", errors);
    }

    const data = await verifyPassword(username, password);

    if (!data.token) {
      throw new ValidationError(data.message || "Invalid credentials");
    }

    // Build cookie with proper attributes for cross-origin
    // SameSite=None and Secure are required for cross-origin cookies
    const cookieOptions = [
      `auth_token=${data.token}`,
      "HttpOnly",
      "Secure",
      "SameSite=None",
      "Path=/",
      "Max-Age=1800", // 30 minutes in seconds
    ];
    
    // Add Domain for cross-subdomain if needed
    const origin = process.env.ORIGIN || "";
    if (origin.includes("kalakalacorner.com")) {
      cookieOptions.push("Domain=.kalakalacorner.com");
    }

    const cookie = cookieOptions.join("; ");
    console.log(`[Login] Setting cookie for user: ${username}`);

    // Return token in response body AND as HttpOnly cookie
    return buildDataResponse(
      200,
      {
        token: data.token,
      },
      context,
      "Login successful",
      [cookie]
    );
  }
);

/**
 * POST /api/logout
 * Logout endpoint - clears the auth cookie
 */
export const logout = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    // Clear the cookie by setting it to expire immediately
    const cookieOptions = [
      "auth_token=",
      "HttpOnly",
      "Secure",
      "SameSite=None",
      "Path=/",
      "Max-Age=0", // Expire immediately
    ];
    
    const origin = process.env.ORIGIN || "";
    if (origin.includes("kalakalacorner.com")) {
      cookieOptions.push("Domain=.kalakalacorner.com");
    }

    const cookie = cookieOptions.join("; ");
    console.log("[Logout] Clearing auth cookie");

    return buildDataResponse(
      200,
      {},
      context,
      "Logged out successfully",
      [cookie]
    );
  }
);

/**
 * GET /api/auth/check
 * Check if user is authenticated
 */
export const checkAuth = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const token = extractToken(context.event);

    if (!token) {
      return buildItemsResponse({ loggedIn: false }, context);
    }

    try {
      const user = await checkLoggedIn(token);
      return buildItemsResponse(
        {
          loggedIn: true,
          user,
        },
        context
      );
    } catch (error) {
      return buildItemsResponse({ loggedIn: false }, context);
    }
  }
);

/**
 * Main consolidated handler for all login/auth operations
 * Routes requests based on HTTP method and path
 */
export const handler = async (
  event: import("aws-lambda").APIGatewayProxyEvent,
  context: import("aws-lambda").Context
): Promise<import("aws-lambda").APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path || event.resource;

  console.log(`[Login Handler] ${method} ${path}`);

  // Route to appropriate handler
  if (method === "POST" && path.includes("/api/login")) {
    return await login(event, context);
  }
  if (method === "POST" && path.includes("/api/logout")) {
    return await logout(event, context);
  }
  if (method === "GET" && path.includes("/api/auth/check")) {
    return await checkAuth(event, context);
  }

  // Not found
  const response = new (require("../core/response-builder").ResponseBuilder)(
    context.awsRequestId,
    event
  );
  return response.notFound(`Route not found: ${method} ${path}`);
};

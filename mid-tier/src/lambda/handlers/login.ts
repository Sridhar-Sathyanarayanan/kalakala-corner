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

    // Return token in response body (client stores in localStorage/sessionStorage)
    return context.response.success(
      {
        success: true,
        token: data.token,
        message: "Login successful",
      },
      200
    );
  }
);

/**
 * POST /api/logout
 * Logout endpoint (client-side token clearing)
 */
export const logout = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    // In Lambda, token management is client-side
    // Client should clear localStorage/sessionStorage
    return context.response.ok("Logged out successfully");
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
      return context.response.success({ loggedIn: false });
    }

    try {
      const user = await checkLoggedIn(token);
      return context.response.success({
        loggedIn: true,
        user,
      });
    } catch (error) {
      return context.response.success({ loggedIn: false });
    }
  }
);

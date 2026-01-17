/**
 * Login Controller
 * Handles authentication and authorization
 */

import logger from "../../services/logger";
import { verifyPassword, checkLoggedIn } from "./service";
import { BaseController, ControllerResponse } from "../base.controller";

/**
 * Login Controller
 * Manages user authentication and JWT token handling
 */
export class LoginController extends BaseController {
  /**
   * Authenticate user with username and password
   */
  async login(username: string, password: string): Promise<ControllerResponse> {
    try {
      // Validate input
      if (!username || !password) {
        logger.warn("Login attempt without credentials");
        return this.badRequest("Username and password are required");
      }

      logger.info(`Login attempt for user: ${username}`);

      // Verify credentials
      const result = await verifyPassword(username, password);
      if (result.message === "User not found") {
        logger.warn(`Login failed: User not found - ${username}`);
        return this.unauthorized("Invalid username or password");
      }

      if (result.message === "Invalid password") {
        logger.warn(`Login failed: Invalid password for user ${username}`);
        return this.unauthorized("Invalid username or password");
      }

      if (result.message === "Login successful" && result.token) {
        logger.info(`Login successful for user: ${username}`);
        return this.success({
          token: result.token,
          username,
          expiresIn: "30m",
        });
      }

      logger.error(`Unexpected login response for user: ${username}`);
      return this.serverError("Login failed");
    } catch (error) {
      logger.error("Error during login", error);
      return this.serverError("Failed to authenticate user");
    }
  }

  /**
   * Logout user (invalidate token)
   */
  async logout(userId?: string): Promise<ControllerResponse> {
    try {
      logger.info(`Logout requested${userId ? ` for user: ${userId}` : ""}`);

      // Note: With JWT tokens, logout is handled client-side (token deletion)
      // This endpoint can be used for logging and audit purposes
      return this.success({
        message: "Logged out successfully",
      });
    } catch (error) {
      logger.error("Error during logout", error);
      return this.serverError("Failed to logout");
    }
  }

  /**
   * Check authentication status and validate token
   */
  async checkAuth(token?: string): Promise<ControllerResponse> {
    try {
      if (!token) {
        logger.warn("Auth check without token");
        return this.unauthorized("No token provided");
      }

      logger.info("Checking authentication status");

      const decoded = await checkLoggedIn(token);

      if (!decoded) {
        logger.warn("Invalid token provided");
        return this.unauthorized("Invalid token");
      }

      logger.info("Authentication check successful");
      return this.success({
        loggedIn: true,
        user: decoded,
      });
    } catch (error) {
      logger.warn("Authentication check failed", error);
      return this.unauthorized("Invalid or expired token");
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(oldToken: string): Promise<ControllerResponse> {
    try {
      if (!oldToken) {
        logger.warn("Token refresh without token");
        return this.unauthorized("No token provided");
      }

      logger.info("Refreshing JWT token");

      // Verify old token
      const decoded = await checkLoggedIn(oldToken);

      if (!decoded) {
        logger.warn("Invalid token for refresh");
        return this.unauthorized("Invalid token");
      }

      // Generate new token
      const jwt = await import("jsonwebtoken");
      const newToken = jwt.sign(
        { username: (decoded as any).username },
        process.env.ADMIN_TOKEN as string,
        { expiresIn: "30m" }
      );

      logger.info("Token refreshed successfully");
      return this.success({
        token: newToken,
        expiresIn: "30m",
      });
    } catch (error) {
      logger.error("Error refreshing token", error);
      return this.unauthorized("Failed to refresh token");
    }
  }
}

// Export singleton instance
export const loginController = new LoginController();

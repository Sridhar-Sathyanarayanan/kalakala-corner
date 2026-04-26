/**
 * Login Routes
 * Authentication endpoints
 */

import { Router, Request, Response } from "express";
import { loginController } from "./controller";
import { verifyAdmin } from "../../middleware/auth.middleware";
import logger from "../../services/logger";

const router = Router();

/**
 * PUBLIC ROUTES
 */

// POST /api/login - Authenticate user
router.post("/api/login", async (req: Request, res: Response) => {
  try {
    console.log(`[ROUTES-START] Login route called`);
    logger.info("Login route called", { body: { username: req.body?.username, hasPassword: !!req.body?.password } });
    
    const { username, password } = req.body;
    console.log(`[ROUTES] Extracted username: ${username}`);
    logger.info(`Attempting login for user: ${username}`);
    
    console.log(`[ROUTES] Calling loginController.login()`);
    const response = await loginController.login(username, password);
    console.log(`[ROUTES] loginController.login() returned:`, response);
    logger.info(`Login response received for user: ${username}`, { hasToken: !!response?.token });
    
    // Set secure cookie if login successful
    res.cookie("auth_token", response.token, {
      httpOnly: false,  // Allow JavaScript access for development
      secure: process.env.NODE_ENV === "production",  // Only secure in production
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    logger.info(`Login successful, sending response for user: ${username}`);
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error during login route", {
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      code: (error as any)?.code,
    });
    res
      .status(401)
      .json({ message: "Failed to login", error: (error as Error).message });
  }
});

// POST /api/logout - Logout user
router.post("/api/logout", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const response = await loginController.logout();

    // Clear auth cookie
    res.clearCookie("auth_token");

    res.status(response.statusCode).json(response);
  } catch (error) {
    logger.error("Error during logout", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to logout",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/auth/check - Check authentication status
router.get("/api/auth/check", async (req: Request, res: Response) => {
  try {
    const token = (req as any).cookies?.auth_token || null;
    const response = await loginController.checkAuth(token);
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    logger.error("Error checking auth status", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check auth status",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;

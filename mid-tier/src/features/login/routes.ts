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
    const { username, password } = req.body;
    const response = await loginController.login(username, password);

    // Set secure cookie if login successful
    if (response.success && (response.data as any)?.token) {
      res.cookie("auth_token", (response.data as any).token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 60 * 1000, // 30 minutes
      });
    }

    res.status(200).json(response);
  } catch (error) {
    logger.error("Error during login", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to authenticate",
      },
      timestamp: new Date().toISOString(),
    });
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

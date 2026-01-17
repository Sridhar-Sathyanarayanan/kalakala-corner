/**
 * Customer Enquiries Routes
 * Customer support and inquiry endpoints
 */

import { Request, Response, Router } from "express";
import { enquiriesController } from "./controller";
import { verifyAdmin } from "../../middleware/auth.middleware";
import logger from "../../services/logger";

const router = Router();

/**
 * PUBLIC ROUTES
 */

// POST /customer-enquiry - Submit a new customer enquiry
router.post("/save-customer-enquiry",verifyAdmin, async (req: Request, res: Response) => {
  try {
    const response = await enquiriesController.createEnquiry(req.body);
    res.status(response.statusCode).json(response);
  } catch (error) {
    logger.error("Error creating customer enquiry", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to submit enquiry",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * ADMIN PROTECTED ROUTES
 */

// GET /enquiries-list - Get all enquiries (admin only)
router.get(
  "/enquiries-list",
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const response = await enquiriesController.getEnquiriesList();
      res.status(response.statusCode).json(response.data);
    } catch (error) {
      logger.error("Error fetching enquiries", error);
      res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch enquiries",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;

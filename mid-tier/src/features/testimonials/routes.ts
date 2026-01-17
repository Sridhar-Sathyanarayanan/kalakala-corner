/**
 * Testimonials Routes
 * All testimonial-related endpoints
 */

import { Router, Request, Response } from "express";
import { testimonialsController } from "./controller";
import { verifyAdmin } from "../../middleware/auth.middleware";
import logger from "../../services/logger";

const router = Router();

/**
 * PUBLIC ROUTES
 */

// GET /testimonials-list - Get all testimonials
router.get("/testimonials-list", async (req: Request, res: Response) => {
  try {
    const response = await testimonialsController.getAllTestimonials();
    res.status(response.statusCode).json(response.data);
  } catch (error) {
    logger.error("Error fetching testimonials", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch testimonials",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * ADMIN PROTECTED ROUTES
 */

// POST /add-testimonial - Add new testimonial (admin only)
router.post(
  "/add-testimonial",
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const response = await testimonialsController.addTestimonial(req.body);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error("Error adding testimonial", error);
      res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add testimonial",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// PUT /update-testimonial/:id - Update testimonial (admin only)
router.put(
  "/update-testimonial/:id",
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const response = await testimonialsController.updateTestimonial(id, req.body);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error("Error updating testimonial", error);
      res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update testimonial",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// DELETE /delete-testimonial/:id - Delete testimonial (admin only)
router.delete(
  "/delete-testimonial/:id",
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const response = await testimonialsController.deleteTestimonial(id);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error("Error deleting testimonial", error);
      res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete testimonial",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;

/**
 * Testimonials Controller
 * Handles all testimonial-related operations
 */

import logger from "../../services/logger";
import {
  getTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "./service";
import { BaseController, ControllerResponse } from "../base.controller";

/**
 * Testimonials Controller
 * Manages customer testimonials and reviews
 */
export class TestimonialsController extends BaseController {
  /**
   * Get all testimonials
   */
  async getAllTestimonials(): Promise<ControllerResponse> {
    try {
      logger.info("Fetching all testimonials");
      const testimonials = await getTestimonials();

      if (!testimonials || testimonials.length === 0) {
        logger.info("No testimonials found");
        return this.success({ items: [] });
      }

      logger.info(`Retrieved ${testimonials.length} testimonials`);
      return this.success({ items: testimonials });
    } catch (error) {
      logger.error("Error fetching testimonials", error);
      return this.serverError("Failed to fetch testimonials");
    }
  }

  /**
   * Add a new testimonial
   */
  async addTestimonial(testimonialData: any, userId?: string): Promise<ControllerResponse> {
    try {
      // Validate required fields
      if (!testimonialData) {
        logger.warn("Testimonial data missing");
        return this.badRequest("Testimonial data is required");
      }

      // Validate essential fields
      if (
        !testimonialData.product ||
        !testimonialData.comments ||
        testimonialData.rating === undefined
      ) {
        logger.warn("Required testimonial fields missing");
        return this.badRequest("Product, comments, and rating are required");
      }

      // Validate rating
      if (
        typeof testimonialData.rating !== "number" ||
        testimonialData.rating < 1 ||
        testimonialData.rating > 5
      ) {
        logger.warn("Invalid rating value");
        return this.badRequest("Rating must be between 1 and 5");
      }

      logger.info(`Adding testimonial for product: ${testimonialData.product}`);

      // Add userId if available
      if (userId) {
        testimonialData.userId = userId;
      }

      const result = await addTestimonial(testimonialData);

      logger.info("Testimonial added successfully");
      return this.created({
        id: result?.id,
        message: "Testimonial added successfully",
      });
    } catch (error) {
      logger.error("Error adding testimonial", error);
      return this.serverError("Failed to add testimonial");
    }
  }

  /**
   * Update an existing testimonial
   */
  async updateTestimonial(
    testimonialId: string,
    testimonialData: any,
    userId?: string
  ): Promise<ControllerResponse> {
    try {
      if (!testimonialId || testimonialId.trim() === "") {
        logger.warn("Testimonial ID missing for update");
        return this.badRequest("Testimonial ID is required");
      }

      if (!testimonialData || Object.keys(testimonialData).length === 0) {
        logger.warn("No testimonial data provided for update");
        return this.badRequest("Testimonial data is required");
      }

      // Validate rating if provided
      if (
        testimonialData.rating !== undefined &&
        (typeof testimonialData.rating !== "number" ||
          testimonialData.rating < 1 ||
          testimonialData.rating > 5)
      ) {
        logger.warn("Invalid rating value");
        return this.badRequest("Rating must be between 1 and 5");
      }

      logger.info(`Updating testimonial: ${testimonialId}`);

      // Add updated timestamp
      testimonialData.updatedAt = new Date().toISOString();

      const numericId = Number(testimonialId);
      if (isNaN(numericId)) {
        return this.badRequest("Invalid testimonial ID format");
      }

      const result = await updateTestimonial(numericId, testimonialData);

      logger.info(`Testimonial updated successfully: ${testimonialId}`);
      return this.success({
        id: testimonialId,
        message: "Testimonial updated successfully",
      });
    } catch (error) {
      logger.error("Error updating testimonial", error);
      return this.serverError("Failed to update testimonial");
    }
  }

  /**
   * Delete a testimonial
   */
  async deleteTestimonial(testimonialId: string, userId?: string): Promise<ControllerResponse> {
    try {
      if (!testimonialId || testimonialId.trim() === "") {
        logger.warn("Testimonial ID missing for deletion");
        return this.badRequest("Testimonial ID is required");
      }

      logger.info(`Deleting testimonial: ${testimonialId}`);

      const numericId = Number(testimonialId);
      if (isNaN(numericId)) {
        return this.badRequest("Invalid testimonial ID format");
      }

      await deleteTestimonial(numericId);

      logger.info(`Testimonial deleted successfully: ${testimonialId}`);
      return this.success({
        id: testimonialId,
        message: "Testimonial deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting testimonial", error);
      return this.serverError("Failed to delete testimonial");
    }
  }

  /**
   * Get user testimonials
   */
  async getUserTestimonials(userId: string): Promise<ControllerResponse> {
    try {
      if (!userId || userId.trim() === "") {
        logger.warn("User ID missing");
        return this.badRequest("User ID is required");
      }

      logger.info(`Fetching testimonials for user: ${userId}`);

      // Get all testimonials and filter by userId
      const allTestimonials = await getTestimonials();

      if (!allTestimonials) {
        return this.success({ items: [] });
      }

      const userTestimonials = allTestimonials.filter(
        (t: any) => t.userId === userId
      );

      logger.info(`Retrieved ${userTestimonials.length} testimonials for user: ${userId}`);
      return this.success({ items: userTestimonials });
    } catch (error) {
      logger.error("Error fetching user testimonials", error);
      return this.serverError("Failed to fetch user testimonials");
    }
  }
}

// Export singleton instance
export const testimonialsController = new TestimonialsController();

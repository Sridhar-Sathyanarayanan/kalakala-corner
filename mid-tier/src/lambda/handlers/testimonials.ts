/**
 * Consolidated Testimonials Handlers
 * All testimonials-related Lambda handlers in one file
 */

import {
  getTestimonials,
  addTestimonial as addTestimonialService,
  updateTestimonial as updateTestimonialService,
  deleteTestimonial as deleteTestimonialService,
} from "../../features/testimonials/service";
import {
  HandlerFactory,
  getPathParameter,
  getBody,
} from "../core/handler-factory";
import { HandlerContext } from "../core/middleware";
import { ValidationError } from "../core/errors";

/**
 * GET /testimonials-list
 * Fetch all testimonials
 */
export const getAllTestimonials = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const testimonials = await getTestimonials();
    return context.response.success({ items: testimonials });
  }
);

/**
 * POST /add-testimonial
 * Create a new testimonial (admin only)
 */
export const addTestimonial = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const body = getBody(context);
    const {
      category,
      product,
      "product-id": productId,
      comments,
      rating,
      customerName,
    } = body;

    // Validation
    const errors: Record<string, string[]> = {};
    if (!category) errors.category = ["Category is required"];
    if (!product) errors.product = ["Product is required"];
    if (!productId) errors["product-id"] = ["Product ID is required"];
    if (!comments) errors.comments = ["Comments are required"];
    if (rating === undefined) errors.rating = ["Rating is required"];

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Testimonial validation failed", errors);
    }

    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      throw new ValidationError(
        "Rating must be a number between 0 and 5"
      );
    }

    const testimonial = await addTestimonialService({
      category,
      product,
      "product-id": productId,
      comments,
      rating: ratingNum,
      customerName,
    });

    return context.response.created(
      testimonial,
      "Testimonial added successfully"
    );
  }
);

/**
 * PUT /update-testimonial/{id}
 * Update an existing testimonial (admin only)
 */
export const updateTestimonial = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const id = getPathParameter(context, "id");

    if (!id) {
      throw new ValidationError("Testimonial ID is required");
    }

    const idNum = Number(id);
    if (isNaN(idNum)) {
      throw new ValidationError("Invalid testimonial ID");
    }

    const body = getBody(context);
    const {
      category,
      product,
      "product-id": productId,
      comments,
      rating,
      customerName,
    } = body;

    const updates: any = {};
    if (category !== undefined) updates.category = category;
    if (product !== undefined) updates.product = product;
    if (productId !== undefined) updates["product-id"] = productId;
    if (comments !== undefined) updates.comments = comments;
    if (customerName !== undefined) updates.customerName = customerName;

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        throw new ValidationError(
          "Rating must be a number between 0 and 5"
        );
      }
      updates.rating = ratingNum;
    }

    const testimonial = await updateTestimonialService(idNum, updates);
    return context.response.success(testimonial);
  }
);

/**
 * DELETE /delete-testimonial/{id}
 * Delete a testimonial (admin only)
 */
export const deleteTestimonial = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const id = getPathParameter(context, "id");

    if (!id) {
      throw new ValidationError("Testimonial ID is required");
    }

    const idNum = Number(id);
    if (isNaN(idNum)) {
      throw new ValidationError("Invalid testimonial ID");
    }

    const result = await deleteTestimonialService(idNum);
    return context.response.success(result);
  }
);

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
 * Helper to build response matching Express format
 */
function buildItemsResponse(items: any, context: HandlerContext) {
  return {
    statusCode: 200,
    body: JSON.stringify({ items }),
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
  message?: string
) {
  const body: any = {
    statusCode,
    success: statusCode >= 200 && statusCode < 300,
    data,
  };

  if (message) {
    body.message = message;
  }

  return {
    statusCode,
    body: JSON.stringify(body),
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
 * GET /testimonials-list
 * Fetch all testimonials
 */
export const getAllTestimonials = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const testimonials = await getTestimonials();
    return buildItemsResponse(testimonials, context);
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

    return buildDataResponse(
      201,
      testimonial,
      context,
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
    return buildDataResponse(
      200,
      testimonial,
      context,
      "Testimonial updated successfully"
    );
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
    return buildDataResponse(
      200,
      result,
      context,
      "Testimonial deleted successfully"
    );
  }
);

/**
 * Main consolidated handler for all testimonial operations
 * Routes requests based on HTTP method and path
 */
export const handler = async (
  event: import("aws-lambda").APIGatewayProxyEvent,
  context: import("aws-lambda").Context
): Promise<import("aws-lambda").APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path || event.resource;

  console.log(`[Testimonials Handler] ${method} ${path}`);

  // Route to appropriate handler
  if (method === "GET" && path.includes("/testimonials-list")) {
    return await getAllTestimonials(event, context);
  }
  if (method === "POST" && path.includes("/add-testimonial")) {
    return await addTestimonial(event, context);
  }
  if (method === "PUT" && path.includes("/update-testimonial")) {
    return await updateTestimonial(event, context);
  }
  if (method === "DELETE" && path.includes("/delete-testimonial")) {
    return await deleteTestimonial(event, context);
  }

  // Not found
  const response = new (require("../core/response-builder").ResponseBuilder)(
    context.awsRequestId,
    event
  );
  return response.notFound(`Route not found: ${method} ${path}`);
};

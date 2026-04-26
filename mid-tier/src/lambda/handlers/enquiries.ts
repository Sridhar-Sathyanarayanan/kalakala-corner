/**
 * Consolidated Enquiries Handlers
 * All customer enquiries-related Lambda handlers in one file
 */

import { enquiriesList, addCustomerEnquiries } from "../../features/enquiries/service";
import {
  HandlerFactory,
  getBody,
  HandlerContext,
} from "../core/handler-factory";
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
 * GET /enquiries-list
 * Fetch all customer enquiries (admin only)
 */
export const getEnquiries = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const enquiries = await enquiriesList();
    return buildItemsResponse(enquiries, context);
  }
);

/**
 * POST /save-customer-enquiry
 * Save a new customer enquiry (public)
 */
export const saveEnquiry = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const body = getBody(context);
    const { name, email, phone, query, product, queryType, category } = body;

    // Validation
    const errors: Record<string, string[]> = {};
    if (!name) errors.name = ["Name is required"];
    if (!email) errors.email = ["Email is required"];
    if (!phone) errors.phone = ["Phone is required"];
    if (!query) errors.query = ["Query is required"];
    // Product and category are required only if queryType is 'product'
    if (queryType === "product" && !product) errors.product = ["Product is required"];
    if (queryType === "product" && !category) errors.category = ["Category is required"];

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Enquiry validation failed", errors);
    }

    const result = await addCustomerEnquiries({
      name,
      email,
      phone: Number(phone),
      query,
      product,
      category,
    });

    return buildDataResponse(
      201,
      result,
      context,
      "Enquiry saved successfully"
    );
  }
);

/**
 * Main consolidated handler for all enquiry operations
 * Routes requests based on HTTP method and path
 */
export const handler = async (
  event: import("aws-lambda").APIGatewayProxyEvent,
  context: import("aws-lambda").Context
): Promise<import("aws-lambda").APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path || event.resource;

  console.log(`[Enquiries Handler] ${method} ${path}`);

  // Route to appropriate handler
  if (method === "GET" && path.includes("/enquiries-list")) {
    return await getEnquiries(event, context);
  }
  if (method === "POST" && path.includes("/save-customer-enquiry")) {
    return await saveEnquiry(event, context);
  }

  // Not found
  const response = new (require("../core/response-builder").ResponseBuilder)(
    context.awsRequestId,
    event
  );
  return response.notFound(`Route not found: ${method} ${path}`);
};

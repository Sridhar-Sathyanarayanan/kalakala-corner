/**
 * Consolidated Products Handlers
 * All product-related Lambda handlers in one file
 */

import {
  getProducts,
  allProductsWithCategory,
  getProduct,
  addProduct as addProductService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
  getCategories as getCategoriesService,
  saveCategories as saveCategoriesService,
} from "../../features/products/service";
import {
  HandlerFactory,
  getPathParameter,
  getBody,
} from "../core/handler-factory";
import { HandlerContext } from "../core/middleware";
import { ValidationError, NotFoundError } from "../core/errors";

/**
 * GET /products-list
 * Fetch all products
 */
export const getAllProducts = HandlerFactory.createPublic(async (context: HandlerContext) => {
  const products = await getProducts();
  return context.response.success({ items: products });
});

/**
 * GET /products-list/{category}
 * Fetch products filtered by category
 */
export const getProductsByCategory = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const category = getPathParameter(context, "category");

    if (!category) {
      throw new ValidationError("Category parameter is required");
    }

    const products = await allProductsWithCategory(category);
    return context.response.success({ items: products });
  }
);

/**
 * GET /product/{id}
 * Fetch a specific product by ID
 */
export const getProductById = HandlerFactory.createPublic(async (context: HandlerContext) => {
  const id = getPathParameter(context, "id");

  if (!id) {
    throw new NotFoundError("Product");
  }

  const product = await getProduct(id);
  return context.response.success({ items: product });
});

/**
 * POST /add-product
 * Create a new product (admin only)
 *
 * NOTE: File uploads need special handling with Lambda.
 * Options:
 * 1. Use S3 pre-signed URLs (client uploads directly to S3)
 * 2. Use base64 encoded files in request
 * 3. Configure API Gateway binary media types
 */
export const addProduct = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const body = getBody(context);

    // Note: For file uploads via Lambda, implement multipart handling or S3 pre-signed URLs
    // This example assumes JSON body with S3 URLs
    const product = await addProductService(body, undefined);
    return context.response.created(
      { items: product },
      "Product created successfully"
    );
  }
);

/**
 * PUT /update-product/{id}
 * Update an existing product (admin only)
 */
export const updateProduct = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const id = getPathParameter(context, "id");

    if (!id) {
      throw new NotFoundError("Product");
    }

    const body = getBody(context);
    const product = await updateProductService(id, body, undefined);
    return context.response.success({ items: product });
  }
);

/**
 * DELETE /delete-product/{id}
 * Delete a product (admin only)
 */
export const deleteProduct = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const id = getPathParameter(context, "id");

    if (!id) {
      throw new NotFoundError("Product");
    }

    const product = await deleteProductService(id);
    return context.response.success({ items: product });
  }
);

/**
 * GET /categories-list
 * Fetch all product categories
 */
export const getCategories = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const categories = await getCategoriesService();
    return context.response.success({ items: categories });
  }
);

/**
 * POST /save-categories
 * Save or update product categories (admin only)
 */
export const saveCategories = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const body = getBody(context);
    const result = await saveCategoriesService(body);
    return context.response.created(
      { items: result },
      "Categories saved successfully"
    );
  }
);

/**
 * POST /fetch-s3-image
 * Fetch image from S3
 *
 * NOTE: Lambda has payload size limits (6MB sync, 69MB async).
 * Best practices:
 * 1. Return pre-signed URL (client downloads directly)
 * 2. Proxy through CloudFront
 * 3. Use Lambda function URL with binary response types
 */
export const fetchS3Image = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const body = getBody(context);
    const url = body?.url;

    if (!url) {
      throw new ValidationError("Missing url in request body");
    }

    // TODO: Implement image serving strategy:
    // Option 1: Return pre-signed URL for direct S3 access
    // Option 2: Proxy through CloudFront
    // Option 3: Stream image with proper binary content-type

    return context.response.success(
      {
        message: "Image serving requires S3 CloudFront integration",
        presignedUrl: url,
      },
      200
    );
  }
);

/**
 * GET /downloadPDF or /downloadPDF/{category}
 * Download product catalogue (admin only)
 *
 * NOTE: Lambda cannot stream large files directly.
 * Solutions:
 * 1. Return pre-signed S3 URL for direct download
 * 2. Use S3 event lambda to generate PDF and store, return URL
 * 3. Generate PDF on-demand but with Lambda's 6MB payload limit, use Lambda Layers
 */
export const downloadCatalogue = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const category = getPathParameter(context, "category");

    // TODO: Implement one of these solutions:
    // Option 1: Generate PDF and return pre-signed URL
    // Option 2: Return pre-generated PDF URL from S3
    // Option 3: Use Lambda for generation + S3 for storage

    return context.response.success(
      {
        message: "PDF download feature requires S3 integration",
        catalogueUrl: `s3://bucket/catalogues/${category || "all"}.pdf`,
      },
      200
    );
  }
);

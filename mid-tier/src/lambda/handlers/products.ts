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
import { parseMultipart, parseExistingImages } from "../core/multipart-parser";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "../../clients/s3Client";
import { randomUUID } from "crypto";
import logger from "../../services/logger";

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
 * GET /products-list
 * Fetch all products
 */
export const getAllProducts = HandlerFactory.createPublic(async (context: HandlerContext) => {
  const products = await getProducts();
  return buildItemsResponse(products, context);
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
    return buildItemsResponse(products, context);
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
  return buildItemsResponse(product, context);
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
    console.log(`[addProduct] ========== HANDLER REACHED ==========`);
    console.log(`[addProduct] User from context: ${JSON.stringify(context.user)}`);
    const contentType = context.event.headers?.['Content-Type'] || context.event.headers?.['content-type'] || '';
    console.log(`[addProduct] Content-Type: ${contentType}`);
    console.log(`[addProduct] isBase64Encoded: ${context.event.isBase64Encoded}`);
    
    const body = getBody(context);
    console.log(`[addProduct] Body received: ${JSON.stringify(body).substring(0, 200)}`);
    
    // Check if it's multipart (file upload)
    if (body._isMultipart) {
      console.log(`[addProduct] Multipart upload detected - parsing...`);
      
      try {
        // Parse multipart data
        const parsed = parseMultipart(body._rawBody, contentType, body._isBase64);
        console.log(`[addProduct] Parsed ${parsed.files.length} files and ${Object.keys(parsed.fields).length} fields`);
        
        // Upload files to S3
        const s3 = getS3Client();
        const uuid = randomUUID();
        const imageUrls: string[] = [];
        
        for (const file of parsed.files) {
          const fileKey = `${uuid}/${file.filename}`;
          console.log(`[addProduct] Uploading ${fileKey} to S3...`);
          
          try {
            await s3.send(
              new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileKey,
                Body: file.buffer,
                ContentType: file.contentType,
                ACL: 'public-read',
              })
            );
            const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
            imageUrls.push(imageUrl);
            console.log(`[addProduct] Uploaded: ${imageUrl}`);
          } catch (err) {
            logger.error(`Failed to upload file to S3: ${fileKey}`, err);
          }
        }
        
        // Clean up arrays - remove undefined/null values and sparse elements
        const cleanArray = (arr: any[]): any[] => {
          if (!Array.isArray(arr)) return [];
          return arr.filter(item => item !== undefined && item !== null);
        };
        
        const cleanVariants = cleanArray(parsed.fields.variants || []);
        const cleanCategory = cleanArray(parsed.fields.category || []);
        const cleanNotes = cleanArray(parsed.fields.notes || []);
        
        console.log(`[addProduct] Cleaned variants: ${cleanVariants.length}`, JSON.stringify(cleanVariants));
        console.log(`[addProduct] Cleaned category: ${cleanCategory.length}`, JSON.stringify(cleanCategory));
        console.log(`[addProduct] Cleaned notes: ${cleanNotes.length}`, JSON.stringify(cleanNotes));
        
        // Build product data from parsed fields
        const productData = {
          name: parsed.fields.name,
          desc: parsed.fields.desc,
          variants: cleanVariants,
          category: cleanCategory,
          notes: cleanNotes,
          id: uuid,
          images: imageUrls,
        };
        
        console.log(`[addProduct] Product data prepared:`, JSON.stringify(productData));
        
        // Save to DynamoDB (pass undefined for files since we already uploaded to S3)
        const product = await addProductService(productData, undefined);
        console.log(`[addProduct] Product created: ${JSON.stringify(product)}`);
        
        return buildDataResponse(
          201,
          product,
          context,
          "Product created successfully"
        );
      } catch (error: any) {
        console.error(`[addProduct] Multipart parsing error:`, error);
        logger.error('Failed to parse multipart data', error);
        return buildDataResponse(
          400,
          null,
          context,
          `Failed to process upload: ${error.message}`
        );
      }
    }

    // JSON path (no files)
    const product = await addProductService(body, undefined);
    console.log(`[addProduct] Product created: ${JSON.stringify(product)}`);
    return buildDataResponse(
      201,
      product,
      context,
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
    console.log(`[updateProduct] ========== HANDLER REACHED ==========`);
    const id = getPathParameter(context, "id");

    if (!id) {
      throw new NotFoundError("Product");
    }

    const contentType = (context.event.headers?.['Content-Type'] || context.event.headers?.['content-type'] || '').toLowerCase();
    console.log(`[updateProduct] Content-Type: ${contentType}`);
    console.log(`[updateProduct] Product ID: ${id}`);
    
    const body = getBody(context);
    
    // Check if it's multipart (file upload)
    if (body._isMultipart) {
      console.log(`[updateProduct] Multipart upload detected - parsing...`);
      
      try {
        // Parse multipart data
        const parsed = parseMultipart(body._rawBody, contentType, body._isBase64);
        console.log(`[updateProduct] Parsed ${parsed.files.length} files and ${Object.keys(parsed.fields).length} fields`);
        
        // Parse existing images
        const existingImages = parseExistingImages(parsed.fields);
        console.log(`[updateProduct] Existing images count: ${existingImages.length}`);
        
        // Upload new files to S3
        const s3 = getS3Client();
        const newImageUrls: string[] = [];
        
        for (const file of parsed.files) {
          const fileKey = `${id}/${file.filename}`;
          console.log(`[updateProduct] Uploading ${fileKey} to S3...`);
          
          try {
            await s3.send(
              new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileKey,
                Body: file.buffer,
                ContentType: file.contentType,
                ACL: 'public-read',
              })
            );
            const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
            newImageUrls.push(imageUrl);
            console.log(`[updateProduct] Uploaded: ${imageUrl}`);
          } catch (err) {
            logger.error(`Failed to upload file to S3: ${fileKey}`, err);
          }
        }
        
        // Combine existing + new images
        const allImages = [...existingImages, ...newImageUrls];
        console.log(`[updateProduct] Total images after update: ${allImages.length}`);
        
        // Clean up arrays - remove undefined/null values and sparse elements
        const cleanArray = (arr: any[]): any[] => {
          if (!Array.isArray(arr)) return [];
          return arr.filter(item => item !== undefined && item !== null);
        };
        
        const cleanVariants = cleanArray(parsed.fields.variants || []);
        const cleanCategory = cleanArray(parsed.fields.category || []);
        const cleanNotes = cleanArray(parsed.fields.notes || []);
        
        console.log(`[updateProduct] Cleaned variants: ${cleanVariants.length}`, JSON.stringify(cleanVariants));
        console.log(`[updateProduct] Cleaned category: ${cleanCategory.length}`, JSON.stringify(cleanCategory));
        console.log(`[updateProduct] Cleaned notes: ${cleanNotes.length}`, JSON.stringify(cleanNotes));
        
        // Build update data from parsed fields
        // IMPORTANT: Pass allImages (existing + new) as existingImages string
        // because we've already uploaded new files ourselves
        const updateData = {
          name: parsed.fields.name,
          desc: parsed.fields.desc,
          variants: cleanVariants,
          category: cleanCategory,
          notes: cleanNotes,
          existingImages: JSON.stringify(allImages), // Pass combined images (existing + new uploads)
        };
        
        console.log(`[updateProduct] Update data prepared:`, JSON.stringify(updateData));
        console.log(`[updateProduct] Images to save in DB:`, JSON.stringify(allImages));
        
        // Call service with undefined for files (we already handled uploads)
        const product = await updateProductService(id, updateData, undefined);
        console.log(`[updateProduct] Product updated: ${JSON.stringify(product)}`);
        
        return buildDataResponse(
          200,
          product,
          context,
          "Product updated successfully"
        );
      } catch (error: any) {
        console.error(`[updateProduct] Multipart parsing error:`, error);
        logger.error('Failed to parse multipart data', error);
        return buildDataResponse(
          400,
          null,
          context,
          `Failed to process upload: ${error.message}`
        );
      }
    }

    // JSON path (no files)
    const product = await updateProductService(id, body, undefined);
    return buildDataResponse(
      200,
      product,
      context,
      "Product updated successfully"
    );
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
    return buildDataResponse(
      200,
      product,
      context,
      "Product deleted successfully"
    );
  }
);

/**
 * GET /categories-list
 * Fetch all product categories
 */
export const getCategories = HandlerFactory.createPublic(
  async (context: HandlerContext) => {
    const categories = await getCategoriesService();
    return buildItemsResponse(categories, context);
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
    return buildDataResponse(
      201,
      result,
      context,
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

    return buildDataResponse(
      200,
      { presignedUrl: url },
      context,
      "Image serving requires S3 CloudFront integration"
    );
  }
);

/**
 * GET /downloadPDF or /downloadPDF/{category}
 * Download product catalogue (admin only)
 */
export const downloadCatalogue = HandlerFactory.createAdmin(
  async (context: HandlerContext) => {
    const category = getPathParameter(context, "category");

    try {
      let products;
      if (category && category !== "all") {
        products = await allProductsWithCategory(category);
      } else {
        products = await getProducts();
      }
      return buildItemsResponse(products, context);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Main consolidated handler for all product operations
 * Routes requests based on HTTP method and path
 */
export const handler = async (
  event: import("aws-lambda").APIGatewayProxyEvent,
  context: import("aws-lambda").Context
): Promise<import("aws-lambda").APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path || event.resource;

  console.log(`[Products Handler] ${method} ${path}`);

  // Route to appropriate handler
  if (method === "GET") {
    if (path.includes("/products-list/")) {
      return await getProductsByCategory(event, context);
    }
    if (path.includes("/products-list")) {
      return await getAllProducts(event, context);
    }
    if (path.includes("/product/")) {
      return await getProductById(event, context);
    }
    if (path.includes("/categories-list")) {
      return await getCategories(event, context);
    }
    if (path.includes("/downloadPDF/")) {
      return await downloadCatalogue(event, context);
    }
    if (path.includes("/downloadPDF")) {
      return await downloadCatalogue(event, context);
    }
  }
  if (method === "POST") {
    if (path.includes("/fetch-s3-image")) {
      return await fetchS3Image(event, context);
    }
    if (path.includes("/add-product")) {
      return await addProduct(event, context);
    }
    if (path.includes("/update-product")) {
      return await updateProduct(event, context);
    }
    if (path.includes("/save-categories")) {
      return await saveCategories(event, context);
    }
  }
  if (method === "DELETE") {
    if (path.includes("/delete-product")) {
      return await deleteProduct(event, context);
    }
  }

  // Not found
  const response = new (require("../core/response-builder").ResponseBuilder)(
    context.awsRequestId,
    event
  );
  return response.notFound(`Route not found: ${method} ${path}`);
};

/**
 * Products Controller
 * Handles all product-related operations
 */

import logger from "../../services/logger";
import {
  getProducts,
  allProductsWithCategory,
  addProduct,
  deleteProduct,
  saveCategories,
  updateProduct,
  getCategories,
  getProduct,
} from "./service";
import { BaseController, ControllerResponse } from "../base.controller";

// Export for backward compatibility
export { ControllerResponse };

/**
 * Product Controller
 * Manages product CRUD operations and category management
 */
export class ProductController extends BaseController {
  /**
   * Get all products
   */
  async getAllProducts(): Promise<any> {
    try {
      logger.info("Fetching all products");
      return await getProducts();
    } catch (error) {
      logger.error("Error fetching all products", error);
      return this.serverError("Failed to fetch products");
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<any> {
    try {
      if (!category || category.trim() === "") {
        logger.warn("Category parameter missing");
        return this.badRequest("Category is required");
      }

      logger.info(`Fetching products for category: ${category}`);
      return await allProductsWithCategory(category);
    } catch (error) {
      logger.error("Error fetching products by category", error);
      return this.serverError("Failed to fetch products");
    }
  }

  /**
   * Add a new product
   */
  async addProduct(productData: any, files?: Express.Multer.File[]): Promise<ControllerResponse> {
    try {
      // Validate required fields
      if (!productData || !productData.name) {
        logger.warn("Invalid product data provided");
        return this.badRequest("Product name is required");
      }

      logger.info(`Adding new product: ${productData.name}`);
      const result = await addProduct(productData, files || []);

      logger.info(`Product added successfully: ${productData.name}`);
      return this.created({
        message: "Product added successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Error adding product", error);
      return this.serverError("Failed to add product");
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    productId: string,
    productData: any,
    files?: Express.Multer.File[]
  ): Promise<ControllerResponse> {
    try {
      if (!productId || productId.trim() === "") {
        logger.warn("Product ID missing for update");
        return this.badRequest("Product ID is required");
      }

      if (!productData || Object.keys(productData).length === 0) {
        logger.warn("No product data provided for update");
        return this.badRequest("Product data is required");
      }

      await updateProduct(productId, productData, files);

      return this.success({
        id: productId,
        message: "Product updated successfully",
      });
    } catch (error) {
      logger.error("Error updating product", error);
      return this.serverError("Failed to update product");
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<ControllerResponse> {
    try {
      if (!productId || productId.trim() === "") {
        logger.warn("Product ID missing for deletion");
        return this.badRequest("Product ID is required");
      }

      logger.info(`Deleting product: ${productId}`);
      await deleteProduct(productId);

      logger.info(`Product deleted successfully: ${productId}`);
      return this.success({
        id: productId,
        message: "Product deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting product", error);
      return this.serverError("Failed to delete product");
    }
  }

  /**
   * Get specific product by ID
   */
  async getProductById(productId: string): Promise<ControllerResponse> {
    try {
      if (!productId || productId.trim() === "") {
        logger.warn("Product ID missing");
        return this.badRequest("Product ID is required");
      }

      logger.info(`Fetching product: ${productId}`);
      const product = await getProduct(productId);

      if (!product) {
        logger.warn(`Product not found: ${productId}`);
        return this.notFound(`Product with ID ${productId} not found`);
      }

      return this.success(product);
    } catch (error) {
      logger.error("Error fetching product by ID", error);
      return this.serverError("Failed to fetch product");
    }
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<ControllerResponse> {
    try {
      const categories = await getCategories();
      return this.success(categories);
    } catch (error) {
      logger.error("Error fetching categories", error);
      return this.serverError("Failed to fetch categories");
    }
  }

  /**
   * Fetch image from S3
   * @deprecated - Image fetching is now handled directly in the route
   */
  async fetchS3Image(url: string): Promise<ControllerResponse> {
    try {
      if (!url || url.trim() === "") {
        logger.warn("S3 URL missing");
        return this.badRequest("URL is required");
      }

      logger.info(`Fetching image from S3: ${url}`);
      
      // Fetch the image from S3
      const response = await fetch(url);
      if (!response.ok) {
        logger.error(`Failed to fetch S3 image: ${response.status}`);
        return this.serverError("Failed to fetch image from S3");
      }

      // Get the image as a buffer
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      
      return this.success({
        image: Buffer.from(buffer).toString("base64"),
        contentType,
      });
    } catch (error) {
      logger.error("Error fetching S3 image", error);
      return this.serverError("Failed to fetch image");
    }
  }

  /**
   * Download product catalogue
   */
  async downloadCatalogue(category?: string): Promise<any> {
    try {
      logger.info(
        `Downloading catalogue${category ? ` for category: ${category}` : ""}`
      );
      let products;
      if (category && category !== "all") {
        products = await allProductsWithCategory(category);
      } else {
        products = await getProducts();
      }
      return { items: products };
    } catch (error) {
      logger.error("Error downloading catalogue", error);
      throw error;
    }
  }

  /**
   * Modify product categories
   */
  async modifyCategory(categoryData: any): Promise<ControllerResponse> {
    try {
      if (!categoryData) {
        logger.warn("Category data missing");
        return this.badRequest("Category data is required");
      }

      const result = await saveCategories(categoryData);

      return this.success({
        message: "Categories modified successfully",
      });
    } catch (error) {
      logger.error("Error modifying categories", error);
      return this.serverError("Failed to modify categories");
    }
  }
}

// Export singleton instance
export const productController = new ProductController();

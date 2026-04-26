/**
 * Products Routes
 * All product-related endpoints
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { productController } from "./controller";
import { verifyAdmin } from "../../middleware/auth.middleware";
import logger from "../../services/logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * PUBLIC ROUTES
 */

// GET /products-list - Get all products
router.get("/products-list", async (req: Request, res: Response) => {
  try {
    const response = await productController.getAllProducts();
    res.status(200).json({ items: response });
  } catch (error) {
    logger.error("Error in products-list route", error);
    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});

// GET /products-list/:category - Get products by category
router.get("/products-list/:category", async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const response = await productController.getProductsByCategory(category);
    res.status(200).json({ items: response });
  } catch (error) {
    logger.error("Error in products by category route", error);
    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});

// GET /product/:id - Get specific product by ID
router.get("/product/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await productController.getProductById(id);
    res.status(response.statusCode).json({ items: response.data });
  } catch (error) {
    logger.error("Error in get product by ID route", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch product",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /fetch-s3-image - Fetch image from S3 and return as blob
router.post("/fetch-s3-image", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({
        success: false,
        statusCode: 400,
        error: {
          code: "BAD_REQUEST",
          message: "URL is required",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Fetch the image directly from S3 and return as blob
    const response = await fetch(url);
    if (!response.ok) {
      logger.error(`Failed to fetch S3 image: ${response.status}`);
      res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          code: "S3_FETCH_ERROR",
          message: "Failed to fetch image from S3",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Set CORS headers explicitly for binary response
    res.setHeader("Access-Control-Allow-Origin", process.env.ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    // Set content type and send blob directly
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    logger.error("Error fetching S3 image", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch image",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /categories-list - Get all categories
router.get("/categories-list", async (req: Request, res: Response) => {
  try {
    const response = await productController.getAllCategories();
    res.status(response.statusCode).json({ items: response.data });
  } catch (error: any) {
    logger.error("Error fetching categories", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch categories",
        details: error?.message || String(error),
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * ADMIN PROTECTED ROUTES
 */

// POST /add-product - Add new product (admin only)
router.post(
  "/add-product",
  upload.array("images"),
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const response = await productController.addProduct(
        req.body,
        req.files as Express.Multer.File[],
      );
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error("Error adding product", error);
      res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add product",
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// POST /update-product/:id - Update product (admin only)
router.post(
  "/update-product/:id",
  upload.array("images"),
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const response = await productController.updateProduct(
        id,
        req.body,
        req.files as Express.Multer.File[],
      );
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error("Error updating product", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  },
);

// DELETE /delete-product/:id - Delete product (admin only)
router.delete(
  "/delete-product/:id",
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const response = await productController.deleteProduct(id);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error("Error deleting product", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  },
);

// GET /downloadPDF - Download product catalogue (admin only)
router.get("/downloadPDF", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const response = await productController.downloadCatalogue("all");
    res.status(200).json(response);
  } catch (error) {
    logger.error("Error downloading catalogue", error);
    res.status(500).json({ message: "Failed to download catalogue", error });
  }
});

// GET /downloadPDF/:category - Download catalogue by category (admin only)
router.get(
  "/downloadPDF/:category",
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const response = await productController.downloadCatalogue(category);
      res.status(200).json(response);
    } catch (error) {
      logger.error("Error downloading catalogue by category", error);
      res.status(500).json({ message: "Failed to download catalogue", error });
    }
  },
);

// POST /save-categories - Save categories (admin only)
router.post(
  "/save-categories",
  verifyAdmin,
  async (req: Request, res: Response) => {
    try {
      const response = await productController.modifyCategory(req.body);
      res.status(response.statusCode).json(response);
    } catch (error) {
      logger.error("Error saving categories", error);
      res.status(500).json({
        success: false,
        statusCode: 500,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save categories",
        },
        timestamp: new Date().toISOString(),
      });
    }
  },
);

export default router;

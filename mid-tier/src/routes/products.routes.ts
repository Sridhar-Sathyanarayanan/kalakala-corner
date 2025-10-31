import { Router } from "express";
import multer from "multer";
import {
  addAProduct,
  deleteAProduct,
  download,
  fetchS3Image,
  getAllCategories,
  getAllProducts,
  getAllProductsWithCategory,
  getAProduct,
  updateAProduct,
  saveAllCategories
} from "../controller/products.controller";
import { verifyAdmin } from "../services/authMiddleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /products - List all products
router.get("/products-list", getAllProducts);
router.get("/products-list/:category", getAllProductsWithCategory);
router.get("/product/:id", getAProduct);
router.post("/add-product", upload.array("images"), verifyAdmin, addAProduct);
router.post(
  "/update-product/:id",
  upload.array("images"),
  verifyAdmin,
  updateAProduct
);
router.delete("/delete-product/:id", verifyAdmin, deleteAProduct);
router.get("/downloadPDF", verifyAdmin, download);
router.post("/fetch-s3-image", fetchS3Image);

router.get("/categories-list", getAllCategories);
router.post("/save-categories", saveAllCategories);

export default router;

import { Router } from "express";
import {
  addAProduct,
  getAllProducts,
  deleteAProduct,
  getAProduct,
  updateAProduct
} from "../controller/products.controller";
import { verifyAdmin } from "../services/authMiddleware";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /products - List all products
router.get("/products-list", getAllProducts);
router.get("/product/:id", getAProduct);
router.post("/add-product", upload.array("images"), verifyAdmin, addAProduct);
router.post("/update-product/:id", upload.array("images"), verifyAdmin, updateAProduct);
router.delete("/delete-product", verifyAdmin, deleteAProduct);

export default router;

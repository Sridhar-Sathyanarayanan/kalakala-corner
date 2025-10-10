import { Router } from "express";
import { getAllProducts } from "../controller/products.controller";
import { verifyAdmin } from "../services/authMiddleware";

const router = Router();

// GET /products - List all products
router.get("/products-list", getAllProducts);
router.post("/add-product", verifyAdmin, getAllProducts);

export default router;

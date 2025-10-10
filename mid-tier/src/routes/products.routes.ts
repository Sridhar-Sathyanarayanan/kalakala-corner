import { Router } from "express";
import { getAllProducts } from "../controller/products.controller";

const router = Router();

// GET /products - List all products
router.get("/products-list", getAllProducts);

export default router;

import { Router } from "express";
import {
  getAllTestimonials,
  addATestimonial,
  updateATestimonial,
  deleteATestimonial,
} from "../controller/testimonials.controller";
import { verifyAdmin } from "../services/authMiddleware";

const router = Router();

// Public route - get all testimonials
router.get("/testimonials-list", getAllTestimonials);

// Admin routes - require authentication
router.post("/add-testimonial", verifyAdmin, addATestimonial);
router.put("/update-testimonial/:id", verifyAdmin, updateATestimonial);
router.delete("/delete-testimonial/:id", verifyAdmin, deleteATestimonial);

export default router;

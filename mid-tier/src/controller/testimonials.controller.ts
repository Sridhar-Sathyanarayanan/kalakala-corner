import { Request, Response } from "express";
import {
  getTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "../services/testimonials.service";
import logger from "../services/logger";

export async function getAllTestimonials(req: Request, res: Response) {
  try {
    const testimonials = await getTestimonials();
    res.status(200).json({ items: testimonials });
  } catch (error) {
    logger.error("Error fetching testimonials", error);
    res.status(500).json({ message: "Failed to fetch testimonials" });
  }
}

export async function addATestimonial(req: Request, res: Response) {
  try {
    const { category, product, "product-id": productId, comments, rating } = req.body;

    if (!category || !product || !productId || !comments || rating === undefined) {
      return res.status(400).json({
        message: "Missing required fields: category, product, product-id, comments, rating",
      });
    }

    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be a number between 0 and 5" });
    }

    const testimonial = await addTestimonial({
      category,
      product,
      "product-id": productId,
      comments,
      rating: ratingNum,
    });

    res.status(201).json(testimonial);
  } catch (error) {
    logger.error("Error adding testimonial", error);
    res.status(500).json({ message: "Failed to add testimonial" });
  }
}

export async function updateATestimonial(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid testimonial ID" });
    }

    const { category, product, "product-id": productId, comments, rating } = req.body;
    const updates: any = {};

    if (category !== undefined) updates.category = category;
    if (product !== undefined) updates.product = product;
    if (productId !== undefined) updates["product-id"] = productId;
    if (comments !== undefined) updates.comments = comments;
    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        return res
          .status(400)
          .json({ message: "Rating must be a number between 0 and 5" });
      }
      updates.rating = ratingNum;
    }

    const testimonial = await updateTestimonial(id, updates);
    res.status(200).json(testimonial);
  } catch (error) {
    logger.error("Error updating testimonial", error);
    res.status(500).json({ message: "Failed to update testimonial" });
  }
}

export async function deleteATestimonial(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid testimonial ID" });
    }

    const result = await deleteTestimonial(id);
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error deleting testimonial", error);
    res.status(500).json({ message: "Failed to delete testimonial" });
  }
}

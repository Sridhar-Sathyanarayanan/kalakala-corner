import { Request, Response } from "express";
import {
  addProduct,
  allProductsWithCategory,
  deleteProduct,
  downloadCatalogue,
  fetchImageFromS3,
  getCategories,
  getProduct,
  getProducts,
  saveCategories,
  updateProduct
} from "../services/product.service";

export const getAllProducts = async (req: Request, res: Response) => {
  const result = await getProducts();
  res.status(200).send({ items: result });
};

export const getAllProductsWithCategory = async (
  req: Request,
  res: Response
) => {
  const { category } = req.params;
  try {
    const result = await allProductsWithCategory(category);
    res.status(200).send({ items: result });
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch products for category" });
  }
};

export const getAProduct = async (req: Request, res: Response) => {
  const result = await getProduct(req.params.id);
  res.status(200).send({ items: result });
};

export const addAProduct = async (req: Request, res: Response) => {
  try {
    const result = await addProduct(req.body, req.files);
    res.status(200).send({ items: result });
  } catch {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const updateAProduct = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const result = await updateProduct(req.params.id, req.body, files);
    res.status(200).send({ items: result });
  } catch {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const deleteAProduct = async (req: Request, res: Response) => {
  try {
    const result = await deleteProduct(req.params.id);
    res.status(200).send({ items: result });
  } catch {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const download = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const result = await downloadCatalogue(category, res);
    res.status(200).send({ items: result });
  } catch {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

export const fetchS3Image = async (req: Request, res: Response) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      res.status(400).send({ message: "Missing url in body" });
      return;
    }
    await fetchImageFromS3(url, res);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch image" });
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  const result = await getCategories();
  res.status(200).send({ items: result });
};

export const saveAllCategories = async (req: Request, res: Response) => {
  try {
    const result = await saveCategories(req.body);
    res.status(200).send({ items: result });
  } catch {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

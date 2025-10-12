import { Request, Response } from "express";
import {
  getProducts,
  addProduct,
  deleteProduct,
  getProduct,
  updateProduct,
} from "../services/product.service";

export const getAllProducts = async (req: Request, res: Response) => {
  const result = await getProducts();
  res.status(200).send({ items: result });
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
    const result = await deleteProduct(req.body);
    res.status(200).send({ items: result });
  } catch {
    res.status(500).send({ message: "Internal Server Error" });
  }
};

import { Request, Response, Router } from "express";
import { enquiriesList } from "../services/customer-enquiries.service";
import logger from "../services/logger";

const router = Router();

router.get("/enquiries-list", async (req: Request, res: Response) => {
  try {
    const data = await enquiriesList();
    res.status(200).send(data);
  } catch (error) {
    logger.error("Unable to fetch all data");
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;

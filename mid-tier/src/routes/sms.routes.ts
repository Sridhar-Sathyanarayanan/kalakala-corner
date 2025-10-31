import { Request, Response, Router } from "express";
import { sendSMS } from "../services/sms.service";
import logger from "../services/logger";

const router = Router();

router.post("/sendSMS", async (req: Request, res: Response) => {
  try {
    const { name, email, phone, query } = req.body;

    // Basic validation
    if (!name || !(email || phone) || !query) {
      return res.status(400).json({ message: "All fields are required." });
    }
    await sendSMS(req.body);
    res.status(200).send({ message: "SMS sent successfully." });
  } catch (error) {
    logger.error("Unable to fetch all data");
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { verifyPassword } from "../services/login.service";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const data = await verifyPassword(req.body.username, req.body.password);
    if (!data.token) {
      res.status(400).send(data);
    }
    res.status(200).send(data);
  } catch (e) {
    res.status(500).send("Some error occurred");
  }
});

export default router;

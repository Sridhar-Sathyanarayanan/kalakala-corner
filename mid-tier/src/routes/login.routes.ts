import { Router, Request, Response } from "express";
import { verifyPassword, checkLoggedIn } from "../services/login.service";

const router = Router();

router.post("/api/login", async (req: Request, res: Response) => {
  try {
    const data = await verifyPassword(req.body.username, req.body.password);
    if (!data.token) {
      res.status(400).send(data);
    } else {
      res.cookie("auth_token", data.token as string, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 30 * 60 * 1000, // 30 minutes
      });
      res.status(200).send({ success: true });
    }
  } catch (e) {
    res.status(500).send("Some error occurred");
  }
});

router.post("/api/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({ success: true, message: "Logged out" });
});

router.get("/api/auth/check", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.json({ loggedIn: false });
  }
  try {
    res.json({ loggedIn: true, user: await checkLoggedIn(token) });
  } catch (err) {
    res.json({ loggedIn: false });
  }
});

export default router;

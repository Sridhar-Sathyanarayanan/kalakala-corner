import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// Extend Express Request to include user data
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload | string;
}
// verifying *admin* access
export const verifyAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies?.auth_token;
    if (!token) {
      res.status(401).json({ message: "No token found" });
      return;
    }
    req.user = jwt.verify(
      token,
      process.env.ADMIN_TOKEN as string
    ) as JwtPayload;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

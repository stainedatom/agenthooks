import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies.access_token;

  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "Access token is missing" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret) as string;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "TokenExpired", message: "Access token has expired" });
      return;
    }
    res.status(403).json({ error: "Forbidden", message: "Invalid access token" });
  }
}
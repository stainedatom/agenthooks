import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface JwtPayload {
  id: string;
  email: string;
}

export type AuthRequest = Request & {
  user: { id: string; email: string };
  cookies: { [key: string]: string };
};

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthRequest;
  const token = authReq.cookies?.access_token;

  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "Access token is missing" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret) as JwtPayload;
    authReq.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "TokenExpired", message: "Access token has expired" });
      return;
    }
    res.status(403).json({ error: "Forbidden", message: "Invalid access token" });
  }
}
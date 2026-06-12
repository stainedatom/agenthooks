import { randomBytes } from "node:crypto";
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "../config";
import mongoclient from "../dbclient";
import { authenticateToken, AuthRequest, JwtPayload } from "../middleware/auth";

const router = Router();

function generateId(): string {
  return randomBytes(16).toString("hex");
}

// Helper: generate tokens
function generateTokens(payload: JwtPayload, jti?: string) {
  const accessToken = jwt.sign(
    { id: payload.id, email: payload.email } as object,
    config.accessTokenSecret,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: payload.id, email: payload.email, jti: jti || generateId() } as object,
    config.refreshTokenSecret,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
}

// Helper: set httpOnly cookies
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: "/",
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
  });
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      res.status(400).json({ error: "BadRequest", message: "Name, email, and password are required" });
      return;
    }

    if (typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "BadRequest", message: "Invalid email format" });
      return;
    }

    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "BadRequest", message: "Password must be at least 8 characters" });
      return;
    }

    const db = mongoclient.db(config.dbName);
    const usersCollection = db.collection(config.usersCollection);

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ error: "Conflict", message: "A user with this email already exists" });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await usersCollection.insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      refreshTokens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userId = result.insertedId.toString();

    // Generate tokens
    const jti = generateId();
    const { accessToken, refreshToken } = generateTokens({ id: userId, email: email.toLowerCase() }, jti);

    // Store refresh token jti
    await usersCollection.updateOne(
      { _id: result.insertedId },
      { $push: { refreshTokens: jti } as any }
    );

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: {
        id: userId,
        name,
        email: email.toLowerCase(),
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "BadRequest", message: "Email and password are required" });
      return;
    }

    const db = mongoclient.db(config.dbName);
    const usersCollection = db.collection(config.usersCollection);

    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    const userId = user._id.toString();

    // Generate tokens
    const jti = generateId();
    const { accessToken, refreshToken } = generateTokens({ id: userId, email: user.email }, jti);

    // Store refresh token jti
    await usersCollection.updateOne(
      { _id: user._id },
      { $push: { refreshTokens: jti } as any }
    );

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: userId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshTokenCookie = req.cookies?.refresh_token;

    if (!refreshTokenCookie) {
      res.status(401).json({ error: "Unauthorized", message: "Refresh token is missing" });
      return;
    }

    // Verify the refresh token
    let decoded: JwtPayload & { jti: string };
    try {
      decoded = jwt.verify(refreshTokenCookie, config.refreshTokenSecret) as JwtPayload & { jti: string };
    } catch (err) {
      res.status(403).json({ error: "Forbidden", message: "Invalid or expired refresh token" });
      return;
    }

    const db = mongoclient.db(config.dbName);
    const usersCollection = db.collection(config.usersCollection);

    // Find user and check that the jti is still valid (not rotated yet)
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.id) });
    if (!user) {
      res.status(403).json({ error: "Forbidden", message: "User not found" });
      return;
    }

    // Check if the jti exists in the user's refreshTokens array
    if (!user.refreshTokens.includes(decoded.jti)) {
      // Possible token reuse attack — invalidate all refresh tokens for this user
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { refreshTokens: [] } }
      );
      res.status(403).json({ error: "Forbidden", message: "Refresh token has been revoked" });
      return;
    }

    // Remove old jti and generate new tokens
    const newJti = generateId();
    await usersCollection.updateOne(
      { _id: user._id },
      { $pull: { refreshTokens: decoded.jti } as any, $push: { refreshTokens: newJti } as any }
    );

    const userId = user._id.toString();
    const { accessToken, refreshToken } = generateTokens(
      { id: userId, email: user.email },
      newJti
    );

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: userId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshTokenCookie = req.cookies?.refresh_token;

    if (refreshTokenCookie) {
      // Try to decode (ignore errors) to remove the jti from DB
      try {
        const decoded = jwt.verify(refreshTokenCookie, config.refreshTokenSecret) as JwtPayload & { jti: string };
        const db = mongoclient.db(config.dbName);
        const usersCollection = db.collection(config.usersCollection);
        await usersCollection.updateOne(
          { _id: new ObjectId(decoded.id) },
          { $pull: { refreshTokens: decoded.jti } as any }
        );
      } catch {
        // Token already invalid — just clear cookies
      }
    }

    // Clear cookies
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/auth" });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

// GET /api/auth/me (protected)
router.get("/me", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = mongoclient.db(config.dbName);
    const usersCollection = db.collection(config.usersCollection);

    const authReq = req as AuthRequest;

    const user = await usersCollection.findOne(
      { _id: new ObjectId(authReq.user.id) },
      { projection: { password: 0, refreshTokens: 0 } }
    );

    if (!user) {
      res.status(404).json({ error: "NotFound", message: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
  }
});

export default router;
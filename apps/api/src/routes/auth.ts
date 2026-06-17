import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "../config";
import mongoclient from "../dbclient";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Helper: generate tokens
function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    userId,
    config.accessTokenSecret,
    { expiresIn: "15m"}
  );

  const refreshToken = jwt.sign(
    userId,
    config.refreshTokenSecret,
    { expiresIn: "7d"}
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userId = result.insertedId.toString();

    const { accessToken, refreshToken } = generateTokens(userId);

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

    const { accessToken, refreshToken } = generateTokens(userId);

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

    const db = mongoclient.db(config.dbName);
    const usersCollection = db.collection(config.usersCollection);

    // Verify the refresh token
    let decoded: string;
    try {
      decoded = jwt.verify(refreshTokenCookie, config.refreshTokenSecret) as string;
    } catch {
      res.status(403).json({ error: "Forbidden", message: "Invalid or expired refresh token" });
      return;
    }

    // Check the user still exists
    const user = await usersCollection.findOne(
      { _id: new ObjectId(decoded) },
      { projection: { _id: 1, email: 1, name: 1 } }
    );
    if (!user) {
      res.status(403).json({ error: "Forbidden", message: "User not found" });
      return;
    }

    const userId = user._id.toString();
    const { accessToken, refreshToken } = generateTokens(userId);

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

    const userId = req.user;

    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
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
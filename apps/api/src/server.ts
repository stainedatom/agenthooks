import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoclient from "./dbclient";
import { config } from "./config";
import authRoutes from "./routes/auth";

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    await mongoclient.connect();
    console.log("Connected to MongoDB");

    app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await mongoclient.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down...");
  await mongoclient.close();
  process.exit(0);
});

start();
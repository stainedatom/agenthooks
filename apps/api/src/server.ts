import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoclient from "./dbclient";
import { config } from "./config";
import authRoutes from "./routes/auth";
import endpointRoutes from "./routes/endpoints";
import { streamText, pipeUIMessageStreamToResponse, convertToModelMessages } from "ai";
import { createOllama } from "ollama-ai-provider-v2";

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
app.use("/api/endpoints", endpointRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const ollama = createOllama({
      baseURL: config.ollamaBaseUrl,
      headers: config.ollamaApiKey
        ? {
            Authorization: `Bearer ${config.ollamaApiKey}`,
          }
        : undefined,
    });

    // Ensure all messages have a parts array as required by newer AI SDK versions
    const formattedMessages = messages.map((m: any) => ({
      ...m,
      parts: m.parts || [{ type: "text", text: m.content || "" }],
    }));

    const modelMessages = await convertToModelMessages(formattedMessages);

    const result = streamText({
      model: ollama(config.aiModel),
      messages: modelMessages,
    });

    return pipeUIMessageStreamToResponse({
      response: res,
      stream: result.toUIMessageStream(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Failed to process chat request" });
  }
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
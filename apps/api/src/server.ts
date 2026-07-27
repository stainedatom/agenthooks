import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoclient from "./dbclient";
import { config } from "./config";
import authRoutes from "./routes/auth";
import endpointRoutes from "./routes/endpoints";
import collectionRoutes from "./routes/collections";
import { streamText, pipeUIMessageStreamToResponse, convertToModelMessages, stepCountIs } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { getDynamicEndpointsTools } from "./tools/dynamicTools";
import { authenticateToken } from "./middleware/auth";

const app = express();

// Middleware
app.use(express.json({ limit: "1mb" }));
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
app.use("/api/collections", collectionRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Chat Endpoint
app.post("/api/chat", authenticateToken, async (req, res) => {
  try {
    const { messages, collectionId } = req.body;
    const userId = req.user;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    // userId is guaranteed by authenticateToken middleware
    const currentUserId: string = userId as string;

    const ollama = createOllama({
      baseURL: config.ollamaBaseUrl,
      headers: config.ollamaApiKey
        ? {
            Authorization: `Bearer ${config.ollamaApiKey}`,
          }
        : undefined,
    });

    // Keep only the most recent 8 messages to prevent context bloat over 10+ turns
    const recentMessages = Array.isArray(messages) ? messages.slice(-8) : [];

    // Ensure all messages have a parts array and fallback-strip any html strings
    const formattedMessages = recentMessages.map((m: any) => ({
      ...m,
      parts: (m.parts || [{ type: "text", text: m.content || "" }]).map((part: any) => {
        if (part.output && typeof part.output === "object" && "html" in part.output) {
          const { html, ...restOutput } = part.output;
          return { ...part, output: restOutput };
        }
        return part;
      }),
    }));

    const modelMessages = await convertToModelMessages(formattedMessages);

    // Load dynamic endpoint tools from the database, scoped to user and optionally a collection
    const dynamicEndpointsTools = await getDynamicEndpointsTools(currentUserId, collectionId || undefined);

    // Convert the registry array into a tools object for streamText
    const tools = dynamicEndpointsTools.reduce((acc, item) => {
      acc[item.name] = item.tool;
      return acc;
    }, {} as Record<string, any>);

    // Build a system prompt hint so the LLM knows about available endpoint tools
    const endpointDescriptions = dynamicEndpointsTools
      .map((item) => `- ${item.name}: ${item.tool.description}`)
      .join("\n");

    const toolsHint = dynamicEndpointsTools.length > 0
      ? `\n\nYou have access to the following API endpoint tools. Use them whenever the user asks for data these endpoints provide:\n${endpointDescriptions}`
      : "";

    const systemMessage = `You are a helpful assistant that executes API endpoints on behalf of the user.${toolsHint}

CRITICAL RULE: Always invoke the corresponding API endpoint tool whenever a user prompt matches an available tool capability. Do NOT summarize or answer from memory or plain text markdown when a matching tool exists. Always call the tool even if similar questions were asked earlier.`;

    const result = streamText({
      model: ollama(config.aiModel),
      system: systemMessage,
      messages: modelMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      toolChoice: "auto",
      stopWhen: stepCountIs(5),
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
export const config = {
  port: 4000,
  mongodbUri: process.env.MONGODB_URI || "",
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || "dev-access-secret",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret",
  accessTokenExpiry: "5s",
  refreshTokenExpiry: "15s",
  dbName: "agenthooks",
  usersCollection: "users",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "https://ollama.com/api",
  ollamaApiKey: process.env.OLLAMA_API_KEY,
  aiModel: process.env.AI_MODEL || "deepseek-v4-flash",
};

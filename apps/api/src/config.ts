export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/agenthooks",
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || "dev-access-secret",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret",
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "7d",
  dbName: process.env.DB_NAME || "agenthooks",
  usersCollection: "users",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "https://ollama.com/api",
  ollamaApiKey: process.env.OLLAMA_API_KEY,
  aiModel: process.env.AI_MODEL
};

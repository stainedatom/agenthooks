export const config = {
  port: 4000,
  mongodbUri: process.env.MONGODB_URI || "",
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || "dev-access-secret",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret",
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "7d",
  dbName: "agenthooks",
  usersCollection: "users",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
};
export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  mongodbUri: process.env.MONGODB_URI || "",
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || "dev-access-secret",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret",
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY as string,
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY as string,
  dbName: process.env.DB_NAME as string,
  usersCollection: process.env.USERS_COLLECTION as string,
  clientOrigin: process.env.CLIENT_ORIGIN as string,
};
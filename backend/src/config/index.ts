import dotenv from "dotenv";
dotenv.config();

export const config = {
  port:
    process.env.PORT ??
    (() => {
      throw new Error("PORT is not defined in environment variables");
    })(),
  nodeEnv:
    process.env.NODE_ENV ??
    (() => {
      throw new Error("NODE_ENV is not defined in environment variables");
    })(),
  clientUrl:
    process.env.CLIENT_URL ??
    (() => {
      throw new Error("CLIENT_URL is not defined in environment variables");
    })(),
  jwtSecret:
    process.env.JWT_SECRET ??
    (() => {
      throw new Error("JWT_SECRET is not defined in environment variables");
    })(),
  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN ??
    (() => {
      throw new Error("JWT_EXPIRES_IN is not defined in environment variables");
    })(),
};

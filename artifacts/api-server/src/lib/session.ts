import session, { type SessionOptions } from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    playerId?: number;
  }
}

const PgStore = connectPgSimple(session);

const secret = process.env["SESSION_SECRET"];
if (!secret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const isProduction = process.env["NODE_ENV"] === "production";

const sessionOptions: SessionOptions = {
  store: new PgStore({
    pool,
    tableName: "session",
    createTableIfMissing: false,
  }),
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

export const sessionMiddleware = session(sessionOptions);

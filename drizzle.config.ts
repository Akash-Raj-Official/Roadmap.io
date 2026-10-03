import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const tursoUrl = process.env.TURSO_DATABASE_URL;

export default defineConfig(
  tursoUrl
    ? {
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: {
          url: tursoUrl,
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
    : {
        schema: "./lib/db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: {
          url: process.env.SQLITE_PATH ?? "sqlite.db",
        },
      },
);

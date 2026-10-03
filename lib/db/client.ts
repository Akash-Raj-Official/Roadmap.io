import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const tursoUrl = process.env.TURSO_DATABASE_URL;

function createSqliteDb() {
  // Lazy-require so the native better-sqlite3 binding is only loaded when the
  // local better-sqlite3 driver is actually used (never on the libSQL path).
  const Database = require("better-sqlite3");
  return drizzleSqlite(new Database(process.env.SQLITE_PATH ?? "sqlite.db"), {
    schema,
  });
}

export const db = tursoUrl
  ? drizzleLibsql(
      createClient({
        url: tursoUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
      { schema },
    )
  : createSqliteDb();

import "dotenv/config";
import { db } from "./client";

async function run() {
  const migrationsFolder = "./drizzle";
  if (process.env.TURSO_DATABASE_URL) {
    const { migrate } = await import("drizzle-orm/libsql/migrator");
    await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    migrate(db as Parameters<typeof migrate>[0], { migrationsFolder });
  }
  console.log("Migrations applied.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

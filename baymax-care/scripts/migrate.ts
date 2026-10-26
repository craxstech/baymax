import "server-only";

import fsSync from "node:fs";
import path from "node:path";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "../src/db/schema";

async function main() {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    const dataDir = (process.cwd() + "/.data/pglite").replace(/\\/g, "/");
    fsSync.mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    await client.waitReady;
    const db = drizzlePglite(client, { schema });
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db, {
      migrationsFolder: (process.cwd() + "/drizzle").replace(/\\/g, "/"),
    });
    console.log("PGlite migrations applied.");
    await client.close();
  } else {
    const client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.DATABASE_SSL === "false" ? false : "require",
      prepare: false,
    });
    const db = drizzlePostgres(client, { schema });
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db as never, {
      migrationsFolder: (process.cwd() + "/drizzle").replace(/\\/g, "/"),
    });
    console.log("PostgreSQL migrations applied.");
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

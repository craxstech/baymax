import "server-only";

import fsSync from "node:fs";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDb = PgliteDatabase<typeof schema>;

type DbGlobal = typeof globalThis & {
  __baymaxDbPromise?: Promise<AppDb>;
  __baymaxPglite?: PGlite;
};

const dbGlobal = globalThis as DbGlobal;

function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

async function initialize(): Promise<AppDb> {
  const url = databaseUrl();

  if (!url) {
    // Local development and self-contained evaluation use a real PostgreSQL
    // engine compiled to WebAssembly (PGlite), persisted under .data/.
    const dataDir = (process.cwd() + "/.data/pglite").replace(/\\/g, "/");
    fsSync.mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    dbGlobal.__baymaxPglite = client;
    await client.waitReady;
    const db = drizzlePglite(client, { schema });
    // Migrations must be run separately via `npm run db:migrate` before first use.
    return db as AppDb;
  }

  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: process.env.DATABASE_SSL === "false" ? false : "require",
    prepare: false,
  });
  const db = drizzlePostgres(client, { schema }) as unknown as AppDb;

  // Production migrations should normally run in CI/release. Opt-in auto-migrate
  // is useful for a first deploy and for integration environments.
  if (process.env.AUTO_MIGRATE === "true") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db as never, { migrationsFolder: (process.cwd() + "/drizzle").replace(/\\/g, "/") });
  }

  return db;
}

export function getDb(): Promise<AppDb> {
  if (!dbGlobal.__baymaxDbPromise) {
    dbGlobal.__baymaxDbPromise = initialize().catch((error) => {
      dbGlobal.__baymaxDbPromise = undefined;
      throw error;
    });
  }
  return dbGlobal.__baymaxDbPromise;
}

export async function closeDb() {
  if (dbGlobal.__baymaxPglite) {
    await dbGlobal.__baymaxPglite.close();
    dbGlobal.__baymaxPglite = undefined;
  }
  dbGlobal.__baymaxDbPromise = undefined;
}

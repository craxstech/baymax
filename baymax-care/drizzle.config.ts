import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(process.env.DATABASE_URL
    ? {
        dbCredentials: {
          url: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_SSL !== "false" ? "require" : false,
        },
      }
    : {}),
  verbose: true,
  strict: true,
});

import { mkdirSync } from "fs";
import { defineConfig } from "drizzle-kit";

mkdirSync(".data", { recursive: true });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:.data/local.db",
  },
});

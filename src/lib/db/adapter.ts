import { mkdirSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { createClient as createLibsqlClient, type Client as LibsqlClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { setSchemaDriver } from "./schema";
import * as sqliteSchema from "./schema-sqlite";
import * as pgSchema from "./schema-pg";

export type DatabaseDriver = "sqlite" | "postgresql";
export type DatabaseType = "sqlite-local" | "sqlite-turso" | "postgresql";

export interface DatabaseConfig {
  driver: DatabaseDriver;
  type: DatabaseType;
  url: string;
  authToken?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any = null;
let currentConfig: DatabaseConfig | null = null;
let initPromise: Promise<void> | null = null;

export function detectDatabaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL;

  if (url && (url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
    return {
      driver: "postgresql",
      type: "postgresql",
      url,
    };
  }

  if (url && url.startsWith("libsql://")) {
    return {
      driver: "sqlite",
      type: "sqlite-turso",
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    };
  }

  return {
    driver: "sqlite",
    type: "sqlite-local",
    url: url || "file:.data/local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  };
}

async function createSqliteTables(client: LibsqlClient) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS buckets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      endpoint TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'auto',
      access_key_id TEXT NOT NULL,
      secret_access_key TEXT NOT NULL,
      bucket_name TEXT NOT NULL,
      public_url TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

async function createPgTables(db: ReturnType<typeof drizzlePg>) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS buckets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      endpoint TEXT NOT NULL,
      region TEXT NOT NULL DEFAULT 'auto',
      access_key_id TEXT NOT NULL,
      secret_access_key TEXT NOT NULL,
      bucket_name TEXT NOT NULL,
      public_url TEXT,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createDatabase(config?: DatabaseConfig): Promise<any> {
  const effectiveConfig = config || detectDatabaseConfig();
  setSchemaDriver(effectiveConfig.driver);

  if (effectiveConfig.driver === "postgresql") {
    return createPostgresDatabase(effectiveConfig);
  }
  return createSqliteDatabase(effectiveConfig);
}

function ensureLocalDatabaseDirectory(url: string) {
  // SQLite creates a missing database file on demand, but never its parent directory.
  if (!url.startsWith("file:")) return;
  const filePath = url.slice("file:".length).split("?")[0];
  if (!filePath) return;
  mkdirSync(dirname(isAbsolute(filePath) ? filePath : resolve(filePath)), { recursive: true });
}

async function createSqliteDatabase(config: DatabaseConfig) {
  ensureLocalDatabaseDirectory(config.url);

  const client = createLibsqlClient({
    url: config.url,
    authToken: config.authToken,
  });

  await createSqliteTables(client);
  return drizzleLibsql(client, { schema: sqliteSchema });
}

async function createPostgresDatabase(config: DatabaseConfig) {
  const { default: postgres } = await import("postgres");

  const client = postgres(config.url, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzlePg(client, { schema: pgSchema });
  await createPgTables(db);
  return db;
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call ensureDatabase() first.");
  }
  return dbInstance;
}

export function resetDatabase() {
  dbInstance = null;
  currentConfig = null;
  initPromise = null;
}

export function setDatabaseInstance(db: ReturnType<typeof drizzleLibsql> | ReturnType<typeof drizzlePg>, config: DatabaseConfig) {
  dbInstance = db;
  currentConfig = config;
  setSchemaDriver(config.driver);
}

export function getCurrentConfig(): DatabaseConfig | null {
  return currentConfig;
}

export async function ensureDatabase(): Promise<void> {
  if (dbInstance) return;

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const config = detectDatabaseConfig();
    const db = await createDatabase(config);
    setDatabaseInstance(db, config);
  })();

  await initPromise;
}

export { sqliteSchema, pgSchema };

import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

export type DatabaseDriver = "d1" | "sqlite" | "postgresql";

export interface DatabaseConfig {
  driver: DatabaseDriver;
  url?: string;
  authToken?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

let dbInstance: ReturnType<typeof createDrizzleDb> | null = null;
let currentConfig: DatabaseConfig | null = null;
let initPromise: Promise<void> | null = null;

async function createTables(client: Client) {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;

  const createBucketsTable = `
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
  `;

  const createSystemSettingsTable = `
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;

  await client.execute(createUsersTable);
  await client.execute(createBucketsTable);
  await client.execute(createSystemSettingsTable);
}

function createDrizzleDb(client: Client) {
  return drizzle(client, { schema });
}

export async function createDatabase(config: DatabaseConfig) {
  const url = config.url || "file:local.db";
  
  const client = createClient({
    url,
    authToken: config.authToken,
  });

  await createTables(client);
  
  return createDrizzleDb(client);
}

export function getDatabase(config?: DatabaseConfig) {
  if (config && (!currentConfig || JSON.stringify(currentConfig) !== JSON.stringify(config))) {
    throw new Error("Database not initialized. Call createDatabase first (async).");
  }
  
  if (!dbInstance) {
    throw new Error("Database not initialized. Call createDatabase first or provide config.");
  }
  
  return dbInstance;
}

export function resetDatabase() {
  dbInstance = null;
  currentConfig = null;
  initPromise = null;
}

export function setDatabaseInstance(db: ReturnType<typeof createDrizzleDb>, config: DatabaseConfig) {
  dbInstance = db;
  currentConfig = config;
}

export async function ensureDatabase(): Promise<void> {
  if (dbInstance) return;

  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const configStr = process.env.DATABASE_CONFIG;
    if (!configStr) {
      throw new Error("DATABASE_CONFIG not set in environment");
    }

    const config = JSON.parse(configStr);
    const db = await createDatabase(config);
    setDatabaseInstance(db, config);
  })();

  await initPromise;
}

export { schema };

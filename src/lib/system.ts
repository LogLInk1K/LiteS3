import { getDatabase, schema, createDatabase, resetDatabase, setDatabaseInstance, type DatabaseConfig } from "./db";
import { eq } from "drizzle-orm";

let isInitialized = false;
let dbConfig: DatabaseConfig | null = null;

export async function initializeDatabase(): Promise<boolean> {
  if (isInitialized) return true;

  const configStr = process.env.DATABASE_CONFIG;
  
  if (configStr) {
    try {
      dbConfig = JSON.parse(configStr);
      resetDatabase();
      const db = await createDatabase(dbConfig!);
      setDatabaseInstance(db, dbConfig!);
      isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize database from env:", error);
    }
  }

  return false;
}

export async function isSetupCompleted(): Promise<boolean> {
  try {
    if (!isInitialized) {
      const initialized = await initializeDatabase();
      if (!initialized) return false;
    }

    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, "setup_completed"))
      .limit(1);

    return result.length > 0 && result[0].value === "true";
  } catch (error) {
    return false;
  }
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    if (!isInitialized) {
      await initializeDatabase();
    }

    const db = getDatabase();
    const result = await db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, key))
      .limit(1);

    return result[0]?.value || null;
  } catch (error) {
    return null;
  }
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  if (!isInitialized) {
    await initializeDatabase();
  }

  const db = getDatabase();
  await db
    .insert(schema.systemSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.systemSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export function setDatabaseConfig(config: DatabaseConfig): void {
  dbConfig = config;
}

export function getDatabaseConfig(): DatabaseConfig | null {
  return dbConfig;
}

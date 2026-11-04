import { getDatabase, getSchema, ensureDatabase, type DatabaseConfig, detectDatabaseConfig } from "./db";
import { eq } from "drizzle-orm";

// Setup state is one-way (false -> true) and can be flipped by another worker
// instance, so never cache it in process memory: always read the database.
export async function isSetupCompleted(): Promise<boolean> {
  try {
    await ensureDatabase();
    const db = getDatabase();
    const s = getSchema();
    const result = await db
      .select()
      .from(s.systemSettings)
      .where(eq(s.systemSettings.key, "setup_completed"))
      .limit(1);

    return result.length > 0 && result[0].value === "true";
  } catch (error) {
    console.error("Failed to check setup status:", error);
    return false;
  }
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    await ensureDatabase();

    const db = getDatabase();
    const s = getSchema();
    const result = await db
      .select()
      .from(s.systemSettings)
      .where(eq(s.systemSettings.key, key))
      .limit(1);

    return result[0]?.value || null;
  } catch (error) {
    return null;
  }
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  await ensureDatabase();

  const db = getDatabase();
  const s = getSchema();
  await db
    .insert(s.systemSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: s.systemSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export function getDatabaseConfig(): DatabaseConfig {
  return detectDatabaseConfig();
}

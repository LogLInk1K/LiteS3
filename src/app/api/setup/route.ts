import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createDatabase, getSchema, setDatabaseInstance, detectDatabaseConfig, type DatabaseConfig } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isSetupCompleted } from "@/lib/system";

export const dynamic = "force-dynamic";

let isInitializing = false;

const testConnectionAttempts = new Map<string, { count: number; firstAttempt: number }>();
const TEST_CONN_MAX_ATTEMPTS = 5;
const TEST_CONN_WINDOW = 60_000;

function checkTestConnectionRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = testConnectionAttempts.get(ip);

  if (!record || now - record.firstAttempt > TEST_CONN_WINDOW) {
    testConnectionAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }

  if (record.count >= TEST_CONN_MAX_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET() {
  try {
    const isInitialized = await isSetupCompleted();
    const response: { initialized: boolean; databaseType?: string } = {
      initialized: isInitialized,
    };
    if (!isInitialized) {
      const config = detectDatabaseConfig();
      response.databaseType = config.type;
    }
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("GET /api/setup error:", error);
    return NextResponse.json({ error: "Failed to check setup status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isInitialized = await isSetupCompleted();
    if (isInitialized) {
      console.warn("[SECURITY] Attempted to reinitialize already setup system");
      return NextResponse.json(
        { error: "System already initialized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { step, admin } = body;

    const config = detectDatabaseConfig();

    if (step === "test-connection") {
      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || "unknown";

      if (!checkTestConnectionRateLimit(clientIp)) {
        return NextResponse.json(
          { error: "Too many connection tests. Please wait and try again." },
          { status: 429 }
        );
      }

      return await testConnection(config);
    }

    if (step === "initialize") {
      if (!admin || !admin.username || !admin.password) {
        return NextResponse.json({ error: "Admin credentials required" }, { status: 400 });
      }
      if (admin.password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      if (admin.username.length < 2) {
        return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
      }
      return await initializeSystem(config, admin);
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

async function testConnection(config: DatabaseConfig) {
  try {
    const db = await createDatabase(config);
    const s = getSchema();

    await db.select().from(s.systemSettings).limit(1);

    return NextResponse.json({ success: true, message: "Connection successful" });
  } catch (error: unknown) {
    console.error("Connection test error:", error);
    return NextResponse.json({ success: false, error: "Connection failed" }, { status: 400 });
  }
}

async function initializeSystem(config: DatabaseConfig, admin: { username: string; password: string; email?: string }) {
  if (isInitializing) {
    return NextResponse.json({ error: "Initialization already in progress" }, { status: 409 });
  }

  isInitializing = true;

  try {
    const db = await createDatabase(config);
    setDatabaseInstance(db, config);

    const s = getSchema();

    const existing = await db
      .select()
      .from(s.systemSettings)
      .where(eq(s.systemSettings.key, "setup_completed"))
      .limit(1);

    if (existing.length > 0 && existing[0].value === "true") {
      console.warn("[SECURITY] Race condition detected: system already initialized at DB level");
      return NextResponse.json({ error: "System already initialized" }, { status: 403 });
    }

    const adminId = crypto.randomUUID();
    const passwordHash = hashPassword(admin.password);
    const now = new Date();

    await (db as any).transaction(async (tx: any) => {
      await tx.insert(s.users).values({
        id: adminId,
        username: admin.username,
        passwordHash,
        email: admin.email || null,
        role: "admin",
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(s.systemSettings).values({
        key: "setup_completed",
        value: "true",
        updatedAt: now,
      });

      await tx.insert(s.systemSettings).values({
        key: "database_driver",
        value: config.driver,
        updatedAt: now,
      });
    });

    console.log("[SECURITY] System initialized successfully with driver:", config.driver);

    return NextResponse.json({
      success: true,
      message: "System initialized successfully",
    });
  } catch (error: unknown) {
    console.error("Initialization error:", error);
    return NextResponse.json({ success: false, error: "Initialization failed" }, { status: 400 });
  } finally {
    isInitializing = false;
  }
}

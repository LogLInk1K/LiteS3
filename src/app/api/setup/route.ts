import { NextRequest, NextResponse } from "next/server";
import { createDatabase, schema, resetDatabase, setDatabaseInstance, type DatabaseConfig } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, config, admin } = body;

    if (step === "test-connection") {
      return await testConnection(config);
    }

    if (step === "initialize") {
      return await initializeSystem(config, admin);
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}

async function testConnection(config: DatabaseConfig) {
  try {
    const db = await createDatabase(config);
    const now = new Date();
    
    await db.insert(schema.systemSettings).values({
      key: "connection_test",
      value: Date.now().toString(),
      updatedAt: now,
    }).onConflictDoUpdate({
      target: schema.systemSettings.key,
      set: { value: Date.now().toString(), updatedAt: now },
    });

    return NextResponse.json({ success: true, message: "Connection successful" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Connection failed" },
      { status: 400 }
    );
  }
}

async function initializeSystem(config: DatabaseConfig, admin: { username: string; password: string; email?: string }) {
  try {
    resetDatabase();
    const db = await createDatabase(config);
    setDatabaseInstance(db, config);

    const adminId = crypto.randomUUID();
    const passwordHash = await hashPassword(admin.password);
    const now = new Date();

    await db.insert(schema.users).values({
      id: adminId,
      username: admin.username,
      passwordHash,
      email: admin.email || null,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.systemSettings).values({
      key: "setup_completed",
      value: "true",
      updatedAt: now,
    });

    await db.insert(schema.systemSettings).values({
      key: "database_config",
      value: JSON.stringify(config),
      updatedAt: now,
    });

    return NextResponse.json({ 
      success: true, 
      message: "System initialized successfully",
      adminId 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Initialization failed" },
      { status: 400 }
    );
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  return NextResponse.json({ status: "ready" });
}

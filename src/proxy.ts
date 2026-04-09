import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createDatabase, schema, setDatabaseInstance } from "./lib/db";
import { eq } from "drizzle-orm";

const SETUP_PATH = "/setup";
const PUBLIC_PATHS = [SETUP_PATH, "/api/setup", "/api/system/status"];
const STATIC_PATHS = ["/_next", "/favicon.ico", "/images"];

async function checkSetupCompleted(): Promise<boolean> {
  try {
    const configStr = process.env.DATABASE_CONFIG;
    if (!configStr) return false;

    const config = JSON.parse(configStr);
    const db = await createDatabase(config);
    setDatabaseInstance(db, config);

    const result = await db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, "setup_completed"))
      .limit(1);

    return result.length > 0 && result[0].value === "true";
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const isSetupCompleted = await checkSetupCompleted();

  if (!isSetupCompleted && pathname !== SETUP_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = SETUP_PATH;
    return NextResponse.redirect(url);
  }

  if (isSetupCompleted && pathname === SETUP_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images).*)",
  ],
};

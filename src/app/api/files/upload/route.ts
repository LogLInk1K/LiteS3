import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPresignedUploadUrl, getDefaultBucket, getBucketConfig } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

const MAX_SINGLE_PUT_SIZE = 5 * 1024 * 1024 * 1024;
const MIN_EXPIRES = 900;
const MAX_EXPIRES = 3600;
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

function isValidKey(key: unknown): key is string {
  if (typeof key !== "string" || !key) return false;
  if (key.startsWith("/") || key.endsWith("/")) return false;
  if (/[\u0000-\u001f\u007f\\]/.test(key)) return false;
  return !key.split("/").includes("..");
}

function normalizeContentType(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return DEFAULT_CONTENT_TYPE;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_CONTENT_TYPE;
  if (trimmed.length > 255 || /[\r\n\u0000-\u001f\u007f]/.test(trimmed)) return null;
  return trimmed;
}

// Assume a conservative 1 MiB/s so large files get a longer-lived signature.
function expiresForSize(size: number): number {
  return Math.min(MAX_EXPIRES, Math.max(MIN_EXPIRES, Math.ceil(size / (1024 * 1024))));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { key, size: rawSize, contentType: rawContentType, bucketId: rawBucketId } =
      body as Record<string, unknown>;

    if (!isValidKey(key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const size = Number(rawSize);
    if (!Number.isFinite(size) || size < 0 || size > MAX_SINGLE_PUT_SIZE) {
      return NextResponse.json(
        { error: `File size must be between 0 and ${MAX_SINGLE_PUT_SIZE} bytes (single PUT limit)` },
        { status: 400 }
      );
    }

    const contentType = normalizeContentType(rawContentType);
    if (!contentType) {
      return NextResponse.json({ error: "Invalid contentType" }, { status: 400 });
    }

    const bucketId = typeof rawBucketId === "string" && rawBucketId ? rawBucketId : undefined;
    const bucket = bucketId ? await getBucketConfig(bucketId) : await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    const expiresIn = expiresForSize(size);
    const url = await getPresignedUploadUrl(bucketId || bucket.id, key, contentType, expiresIn);

    return NextResponse.json({ url, key, contentType, expiresIn, method: "PUT" });
  } catch (error: unknown) {
    console.error("POST /api/files/upload error:", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}

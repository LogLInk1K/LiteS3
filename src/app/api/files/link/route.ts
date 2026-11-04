import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPresignedDownloadUrlForConfig, getPublicUrl, getDefaultBucket, getBucketConfig } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

const MAX_PRESIGNED_EXPIRES = 3600;
const MAX_BATCH_KEYS = 500;

function isValidKey(key: string | null): key is string {
  if (!key || key.startsWith("/")) return false;
  if (/[\u0000-\u001f\u007f]/.test(key)) return false;
  return !key.split("/").includes("..");
}

function normalizeExpires(value: unknown): number {
  const requested = Number(value ?? 3600);
  const safe = Number.isFinite(requested) ? requested : 3600;
  return Math.min(Math.max(safe, 60), MAX_PRESIGNED_EXPIRES);
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
    
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const bucketId = searchParams.get("bucketId") || undefined;
    const forceDownload = searchParams.get("download") === "1";
    const expiresIn = normalizeExpires(searchParams.get("expiresIn"));

    if (!isValidKey(key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const bucket = bucketId ? await getBucketConfig(bucketId) : await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    // Public buckets expose permanent, anonymous URLs; private ones keep presigned links.
    // Downloads need Content-Disposition: attachment, which only a signed URL can provide.
    if (!forceDownload) {
      const publicUrl = getPublicUrl(bucket, key);
      if (publicUrl) {
        return NextResponse.json({ url: publicUrl, permanent: true });
      }
    }

    const url = await getPresignedDownloadUrlForConfig(bucket, key, expiresIn, forceDownload);
    return NextResponse.json({ url, permanent: false, expiresIn });
  } catch (error: unknown) {
    console.error("GET /api/files/link error:", error);
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const keys = body.keys;
    const bucketId = typeof body.bucketId === "string" ? body.bucketId : undefined;
    const forceDownload = body.download === true;
    const expiresIn = normalizeExpires(body.expiresIn);

    if (
      !Array.isArray(keys) ||
      keys.length === 0 ||
      keys.length > MAX_BATCH_KEYS ||
      !keys.every((key) => typeof key === "string" && isValidKey(key))
    ) {
      return NextResponse.json({ error: "Invalid keys" }, { status: 400 });
    }

    const bucket = bucketId ? await getBucketConfig(bucketId) : await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    // One database lookup for the whole batch; signing is purely local HMAC.
    const links = await Promise.all(
      (keys as string[]).map(async (key) => {
        if (!forceDownload) {
          const publicUrl = getPublicUrl(bucket, key);
          if (publicUrl) return { key, url: publicUrl, permanent: true as const };
        }
        const url = await getPresignedDownloadUrlForConfig(bucket, key, expiresIn, forceDownload);
        return { key, url, permanent: false as const, expiresIn };
      }),
    );

    return NextResponse.json({ links });
  } catch (error: unknown) {
    console.error("POST /api/files/link error:", error);
    return NextResponse.json({ error: "Failed to generate links" }, { status: 500 });
  }
}

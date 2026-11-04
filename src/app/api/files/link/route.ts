import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPresignedDownloadUrlForConfig, getPublicUrl, getDefaultBucket, getBucketConfig } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

const MAX_PRESIGNED_EXPIRES = 3600;

function isValidKey(key: string | null): key is string {
  if (!key || key.startsWith("/")) return false;
  if (/[\u0000-\u001f\u007f]/.test(key)) return false;
  return !key.split("/").includes("..");
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
    const requestedExpires = parseInt(searchParams.get("expiresIn") || "3600", 10);
    const expiresIn = Math.min(Math.max(requestedExpires, 60), MAX_PRESIGNED_EXPIRES);

    if (!isValidKey(key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const bucket = bucketId ? await getBucketConfig(bucketId) : await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    // Public buckets expose permanent, anonymous URLs; private ones keep presigned links.
    const publicUrl = getPublicUrl(bucket, key);
    if (publicUrl) {
      return NextResponse.json({ url: publicUrl, permanent: true });
    }

    const url = await getPresignedDownloadUrlForConfig(bucket, key, expiresIn);
    return NextResponse.json({ url, permanent: false, expiresIn });
  } catch (error: unknown) {
    console.error("GET /api/files/link error:", error);
    return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
  }
}

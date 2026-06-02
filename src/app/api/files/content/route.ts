import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getObjectContent, getDefaultBucket, getBucketConfig } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

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

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const bucket = bucketId ? await getBucketConfig(bucketId) : await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    const { body, contentType } = await getObjectContent(bucketId || bucket.id, key);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType || "text/plain; charset=utf-8",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/files/content error:", error);
    return NextResponse.json({ error: "Failed to get file content" }, { status: 500 });
  }
}

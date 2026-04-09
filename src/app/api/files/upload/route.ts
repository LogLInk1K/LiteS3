import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPresignedUploadUrl, getDefaultBucket } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
    
    const { key, contentType, bucketId } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const bucket = await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    const url = await getPresignedUploadUrl(bucketId || bucket.id, key, contentType || "application/octet-stream");

    return NextResponse.json({ url, key });
  } catch (error: any) {
    console.error("POST /api/files/upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

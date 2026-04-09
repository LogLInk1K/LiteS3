import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { copyObject, deleteObject, getDefaultBucket } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
    
    const { sourceKey, destKey, bucketId } = await request.json();

    if (!sourceKey || !destKey) {
      return NextResponse.json({ error: "sourceKey and destKey are required" }, { status: 400 });
    }

    const bucket = await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    await copyObject(bucketId || bucket.id, sourceKey, destKey);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/files/move error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
    
    const { sourceKey, destKey, bucketId } = await request.json();

    if (!sourceKey || !destKey) {
      return NextResponse.json({ error: "sourceKey and destKey are required" }, { status: 400 });
    }

    const bucket = await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    const targetBucketId = bucketId || bucket.id;
    await copyObject(targetBucketId, sourceKey, destKey);
    await deleteObject(targetBucketId, sourceKey);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/files/move error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

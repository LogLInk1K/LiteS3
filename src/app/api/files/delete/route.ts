import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteObject, getDefaultBucket } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

export async function DELETE(request: Request) {
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

    const bucket = await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    await deleteObject(bucketId || bucket.id, key);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/files/delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

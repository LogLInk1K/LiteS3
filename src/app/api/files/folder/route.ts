import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadObject, getDefaultBucket } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
    
    const { key, bucketId } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const bucket = await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    const folderKey = key.endsWith("/") ? key : key + "/";
    
    await uploadObject(bucketId || bucket.id, folderKey, new Uint8Array(0), "application/x-directory");
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/files/folder error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

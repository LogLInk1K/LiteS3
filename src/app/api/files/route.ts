import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listObjects, getDefaultBucket, getBucketConfig } from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
    
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") || "";
    const bucketId = searchParams.get("bucketId") || undefined;

    const bucket = bucketId ? await getBucketConfig(bucketId) : await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    const result = await listObjects(bucketId || bucket.id, prefix);

    const folders = (result.CommonPrefixes || []).map((cp) => ({
      key: cp.Prefix!,
      name: cp.Prefix!.replace(prefix, "").replace(/\/$/, ""),
      type: "folder" as const,
    }));

    const files = (result.Contents || [])
      .filter((obj) => obj.Key !== prefix)
      .map((obj) => ({
        key: obj.Key!,
        name: obj.Key!.replace(prefix, "").split("/").pop() || obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified?.toISOString() || "",
        type: "file" as const,
      }));

    return NextResponse.json({ folders, files, prefix, bucketId: bucketId || bucket.id });
  } catch (error: any) {
    console.error("GET /api/files error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

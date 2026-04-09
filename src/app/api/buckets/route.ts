import { NextRequest, NextResponse } from "next/server";
import {
  listAllBuckets,
  createBucketConfig,
  testBucketConnection,
  type BucketConfig,
} from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

export async function GET() {
  try {
    await ensureDatabase();
    const buckets = await listAllBuckets();
    const safeBuckets = buckets.map((b) => ({
      id: b.id,
      name: b.name,
      endpoint: b.endpoint,
      region: b.region,
      bucketName: b.bucketName,
      publicUrl: b.publicUrl,
      isDefault: b.isDefault,
    }));
    
    return NextResponse.json({ buckets: safeBuckets });
  } catch (error) {
    console.error("GET /api/buckets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list buckets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const body = await request.json();
    const { action, config } = body;

    if (action === "test") {
      const result = await testBucketConnection(config);
      return NextResponse.json(result);
    }

    if (action === "create") {
      const newBucket = await createBucketConfig({
        name: config.name,
        endpoint: config.endpoint,
        region: config.region || "auto",
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        bucketName: config.bucketName,
        publicUrl: config.publicUrl || null,
        isDefault: config.isDefault || false,
      });

      return NextResponse.json({
        success: true,
        bucket: {
          id: newBucket.id,
          name: newBucket.name,
          endpoint: newBucket.endpoint,
          region: newBucket.region,
          bucketName: newBucket.bucketName,
          publicUrl: newBucket.publicUrl,
          isDefault: newBucket.isDefault,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/buckets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 500 }
    );
  }
}

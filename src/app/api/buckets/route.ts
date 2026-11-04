import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listAllBuckets,
  createBucketConfig,
  getBucketConfig,
  testBucketConnection,
  type BucketConfig,
} from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  } catch (error: unknown) {
    console.error("GET /api/buckets error:", error);
    return NextResponse.json({ error: "Failed to list buckets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();
    const body = await request.json();
    const { action, config } = body;

    if (action === "test") {
      if (!config.bucketName) {
        return NextResponse.json({ success: false, error: "BUCKET_NAME_REQUIRED" });
      }
      if (!config.endpoint) {
        return NextResponse.json({ success: false, error: "ENDPOINT_REQUIRED" });
      }

      const hasAccessKey = !!config.accessKeyId;
      const hasSecretKey = !!config.secretAccessKey;
      if (hasAccessKey !== hasSecretKey) {
        return NextResponse.json({ success: false, error: "CREDENTIALS_PAIR_REQUIRED" });
      }

      const testConfig: Omit<BucketConfig, "id" | "isDefault"> = {
        name: config.name || "",
        endpoint: config.endpoint,
        region: config.region || "auto",
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        bucketName: config.bucketName,
        publicUrl: config.publicUrl || null,
      };

      // In edit mode the form leaves credentials blank ("keep current"), so fall
      // back to the stored ones instead of rejecting the test.
      if (!hasAccessKey) {
        const bucketId = typeof body.bucketId === "string" ? body.bucketId : null;
        if (!bucketId) {
          return NextResponse.json({ success: false, error: "ACCESS_KEY_REQUIRED" });
        }
        const existing = await getBucketConfig(bucketId);
        if (!existing) {
          return NextResponse.json({ success: false, error: "BUCKET_NOT_FOUND" });
        }
        testConfig.accessKeyId = existing.accessKeyId;
        testConfig.secretAccessKey = existing.secretAccessKey;
      }

      const result = await testBucketConnection(testConfig);
      return NextResponse.json(result);
    }

    if (action === "create") {
      if (!config.bucketName) {
        return NextResponse.json({ error: "BUCKET_NAME_REQUIRED" }, { status: 400 });
      }
      if (!config.endpoint) {
        return NextResponse.json({ error: "ENDPOINT_REQUIRED" }, { status: 400 });
      }
      if (!config.accessKeyId) {
        return NextResponse.json({ error: "ACCESS_KEY_REQUIRED" }, { status: 400 });
      }
      if (!config.secretAccessKey) {
        return NextResponse.json({ error: "SECRET_KEY_REQUIRED" }, { status: 400 });
      }
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
  } catch (error: unknown) {
    console.error("POST /api/buckets error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

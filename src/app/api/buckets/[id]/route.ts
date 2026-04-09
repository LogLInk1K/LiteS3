import { NextRequest, NextResponse } from "next/server";
import {
  getBucketConfig,
  updateBucketConfig,
  deleteBucketConfig,
  setDefaultBucket,
} from "@/lib/s3";
import { ensureDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabase();
    const { id } = await params;
    const bucket = await getBucketConfig(id);
    
    if (!bucket) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    return NextResponse.json({
      bucket: {
        id: bucket.id,
        name: bucket.name,
        endpoint: bucket.endpoint,
        region: bucket.region,
        bucketName: bucket.bucketName,
        publicUrl: bucket.publicUrl,
        isDefault: bucket.isDefault,
      },
    });
  } catch (error) {
    console.error("GET /api/buckets/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get bucket" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabase();
    const { id } = await params;
    const body = await request.json();
    
    const updateData: Record<string, unknown> = {
      name: body.name,
      endpoint: body.endpoint,
      region: body.region,
      bucketName: body.bucketName,
      publicUrl: body.publicUrl,
    };
    
    if (body.accessKeyId) {
      updateData.accessKeyId = body.accessKeyId;
    }
    if (body.secretAccessKey) {
      updateData.secretAccessKey = body.secretAccessKey;
    }

    const updated = await updateBucketConfig(id, updateData);

    if (!updated) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      bucket: {
        id: updated.id,
        name: updated.name,
        endpoint: updated.endpoint,
        region: updated.region,
        bucketName: updated.bucketName,
        publicUrl: updated.publicUrl,
        isDefault: updated.isDefault,
      },
    });
  } catch (error) {
    console.error("PUT /api/buckets/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update bucket" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabase();
    const { id } = await params;
    await deleteBucketConfig(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/buckets/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete bucket" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabase();
    const { id } = await params;
    const body = await request.json();

    if (body.action === "set-default") {
      await setDefaultBucket(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/buckets/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 500 }
    );
  }
}

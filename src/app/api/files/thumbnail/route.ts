import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createS3Client, getDefaultBucket } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ensureDatabase } from "@/lib/db";
import sharp from "sharp";

const imageCache = new Map<string, { data: ArrayBuffer; contentType: string; expiresAt: number }>();

const THUMBNAIL_SIZE = 200;
const CACHE_TTL = 50 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

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
    const size = Math.min(parseInt(searchParams.get("size") || String(THUMBNAIL_SIZE)), 800);

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const bucket = await getDefaultBucket();
    if (!bucket) {
      return NextResponse.json({ error: "No bucket configured" }, { status: 400 });
    }

    const cacheKey = `${bucketId || bucket.id}:${key}:${size}`;
    const cached = imageCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(cached.data, {
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=3600, immutable",
        },
      });
    }

    const client = createS3Client(bucket);
    const command = new GetObjectCommand({
      Bucket: bucket.bucketName,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: "Empty response" }, { status: 500 });
    }

    const bytes = await response.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);

    const resized = await sharp(buffer)
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    const contentType = "image/webp";
    const data = resized.buffer.slice(resized.byteOffset, resized.byteOffset + resized.byteLength) as ArrayBuffer;

    if (imageCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = imageCache.keys().next().value;
      if (oldest) imageCache.delete(oldest);
    }
    imageCache.set(cacheKey, { data, contentType, expiresAt: Date.now() + CACHE_TTL });

    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (error: any) {
    console.error("GET /api/files/thumbnail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

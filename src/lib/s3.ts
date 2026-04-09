import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getDatabase, schema, type Bucket } from "./db";
import { eq } from "drizzle-orm";

export interface BucketConfig {
  id: string;
  name: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string | null;
  isDefault: boolean;
}

const clientCache = new Map<string, S3Client>();

export function createS3Client(config: BucketConfig): S3Client {
  const cacheKey = config.id;
  
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const client = new S3Client({
    region: config.region || "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: !config.endpoint.includes("amazonaws.com"),
  });

  clientCache.set(cacheKey, client);
  return client;
}

export function clearClientCache(bucketId?: string) {
  if (bucketId) {
    clientCache.delete(bucketId);
  } else {
    clientCache.clear();
  }
}

export async function getBucketConfig(bucketId: string): Promise<BucketConfig | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(schema.buckets)
    .where(eq(schema.buckets.id, bucketId))
    .limit(1);
  
  return result[0] as BucketConfig | null;
}

export async function getDefaultBucket(): Promise<BucketConfig | null> {
  const db = getDatabase();
  const result = await db
    .select()
    .from(schema.buckets)
    .where(eq(schema.buckets.isDefault, true))
    .limit(1);
  
  if (result.length > 0) {
    return result[0] as BucketConfig;
  }
  
  const allBuckets = await db.select().from(schema.buckets).limit(1);
  return allBuckets[0] as BucketConfig | null;
}

export async function listAllBuckets(): Promise<BucketConfig[]> {
  const db = getDatabase();
  const result = await db.select().from(schema.buckets);
  return result as BucketConfig[];
}

export async function createBucketConfig(data: Omit<BucketConfig, "id" | "createdAt" | "updatedAt">): Promise<BucketConfig> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  
  await db.insert(schema.buckets).values({
    id,
    name: data.name,
    endpoint: data.endpoint,
    region: data.region || "auto",
    accessKeyId: data.accessKeyId,
    secretAccessKey: data.secretAccessKey,
    bucketName: data.bucketName,
    publicUrl: data.publicUrl || null,
    isDefault: data.isDefault || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return (await getBucketConfig(id))!;
}

export async function updateBucketConfig(id: string, data: Partial<Omit<BucketConfig, "id" | "createdAt" | "updatedAt">>): Promise<BucketConfig | null> {
  const db = getDatabase();
  
  await db
    .update(schema.buckets)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(schema.buckets.id, id));

  clearClientCache(id);
  return getBucketConfig(id);
}

export async function deleteBucketConfig(id: string): Promise<boolean> {
  const db = getDatabase();
  
  await db.delete(schema.buckets).where(eq(schema.buckets.id, id));
  clearClientCache(id);
  return true;
}

export async function setDefaultBucket(id: string): Promise<void> {
  const db = getDatabase();
  
  await db
    .update(schema.buckets)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(schema.buckets.isDefault, true));

  await db
    .update(schema.buckets)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(schema.buckets.id, id));
}

export async function listObjects(bucketId: string, prefix: string = "") {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const normalizedPrefix = prefix && !prefix.endsWith("/") ? prefix + "/" : prefix;
  
  const command = new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: normalizedPrefix,
    Delimiter: "/",
    MaxKeys: 1000,
  });
  
  return client.send(command);
}

export async function deleteObject(bucketId: string, key: string) {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });
  
  return client.send(command);
}

export async function headObject(bucketId: string, key: string) {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const command = new HeadObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });
  
  return client.send(command);
}

export async function copyObject(bucketId: string, sourceKey: string, destKey: string) {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const command = new CopyObjectCommand({
    Bucket: config.bucketName,
    CopySource: `${config.bucketName}/${sourceKey}`,
    Key: destKey,
  });
  
  return client.send(command);
}

export async function getPresignedUploadUrl(bucketId: string, key: string, contentType: string, expiresIn: number = 3600) {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });
  
  return getSignedUrl(client, command, { expiresIn });
}

export async function getPresignedDownloadUrl(bucketId: string, key: string, expiresIn: number = 3600) {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });
  
  return getSignedUrl(client, command, { expiresIn });
}

export async function testBucketConnection(config: Omit<BucketConfig, "id" | "isDefault">): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new S3Client({
      region: config.region || "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: !config.endpoint.includes("amazonaws.com"),
    });

    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 1,
    });
    
    await client.send(command);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Connection failed" 
    };
  }
}

export function getPublicUrl(config: BucketConfig, key: string): string | null {
  if (!config.publicUrl) return null;
  return `${config.publicUrl.replace(/\/$/, "")}/${key}`;
}

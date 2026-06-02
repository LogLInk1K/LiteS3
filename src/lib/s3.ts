import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getDatabase, getSchema, type Bucket } from "./db";
import { encrypt, decrypt, isEncrypted } from "./encryption";
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

const MAX_CACHE_SIZE = 50;
const clientCache = new Map<string, { client: S3Client; lastAccess: number }>();

function evictOldestClient() {
  if (clientCache.size <= MAX_CACHE_SIZE) return;
  let oldest: string | null = null;
  let oldestTime = Infinity;
  for (const [key, value] of clientCache) {
    if (value.lastAccess < oldestTime) {
      oldestTime = value.lastAccess;
      oldest = key;
    }
  }
  if (oldest) clientCache.delete(oldest);
}

function decryptBucketConfig(row: Record<string, unknown>): BucketConfig {
  return {
    ...row,
    accessKeyId: typeof row.accessKeyId === "string" && isEncrypted(row.accessKeyId)
      ? decrypt(row.accessKeyId)
      : (row.accessKeyId as string),
    secretAccessKey: typeof row.secretAccessKey === "string" && isEncrypted(row.secretAccessKey)
      ? decrypt(row.secretAccessKey)
      : (row.secretAccessKey as string),
  } as BucketConfig;
}

export function createS3Client(config: BucketConfig): S3Client {
  const cacheKey = config.id;
  const cached = clientCache.get(cacheKey);
  
  if (cached) {
    cached.lastAccess = Date.now();
    return cached.client;
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

  evictOldestClient();
  clientCache.set(cacheKey, { client, lastAccess: Date.now() });
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
  const s = getSchema();
  const result = await db
    .select()
    .from(s.buckets)
    .where(eq(s.buckets.id, bucketId))
    .limit(1);
  
  if (result.length === 0) return null;
  return decryptBucketConfig(result[0]);
}

export async function getDefaultBucket(): Promise<BucketConfig | null> {
  const db = getDatabase();
  const s = getSchema();
  const result = await db
    .select()
    .from(s.buckets)
    .where(eq(s.buckets.isDefault, true))
    .limit(1);
  
  if (result.length > 0) {
    return decryptBucketConfig(result[0]);
  }
  
  const allBuckets = await db.select().from(s.buckets).limit(1);
  if (allBuckets.length === 0) return null;
  return decryptBucketConfig(allBuckets[0]);
}

export async function listAllBuckets(): Promise<BucketConfig[]> {
  const db = getDatabase();
  const result = await db.select().from(getSchema().buckets);
  return result.map((row: Record<string, unknown>) => decryptBucketConfig(row));
}

export async function createBucketConfig(data: Omit<BucketConfig, "id" | "createdAt" | "updatedAt">): Promise<BucketConfig> {
  const db = getDatabase();
  const s = getSchema();
  const id = crypto.randomUUID();
  
  await db.insert(s.buckets).values({
    id,
    name: data.name,
    endpoint: data.endpoint,
    region: data.region || "auto",
    accessKeyId: encrypt(data.accessKeyId),
    secretAccessKey: encrypt(data.secretAccessKey),
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
  const s = getSchema();
  
  const encryptedData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.accessKeyId) {
    encryptedData.accessKeyId = encrypt(data.accessKeyId);
  }
  if (data.secretAccessKey) {
    encryptedData.secretAccessKey = encrypt(data.secretAccessKey);
  }
  
  await db
    .update(s.buckets)
    .set(encryptedData)
    .where(eq(s.buckets.id, id));

  clearClientCache(id);
  return getBucketConfig(id);
}

export async function deleteBucketConfig(id: string): Promise<boolean> {
  const db = getDatabase();
  const s = getSchema();
  
  const bucket = await getBucketConfig(id);
  await db.delete(s.buckets).where(eq(s.buckets.id, id));
  clearClientCache(id);
  
  if (bucket?.isDefault) {
    const remaining = await db
      .select()
      .from(s.buckets)
      .limit(1);
    if (remaining.length > 0) {
      await db
        .update(s.buckets)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(s.buckets.id, remaining[0].id));
    }
  }
  
  return true;
}

export async function setDefaultBucket(id: string): Promise<void> {
  const db = getDatabase();
  const s = getSchema();
  
  await db
    .update(s.buckets)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(s.buckets.isDefault, true));

  await db
    .update(s.buckets)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(s.buckets.id, id));
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

export async function listAllObjects(bucketId: string, prefix: string) {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const normalizedPrefix = prefix.endsWith("/") ? prefix : prefix + "/";
  const allObjects: { Key?: string; Size?: number; LastModified?: Date }[] = [];
  let continuationToken: string | undefined = undefined;
  
  do {
    const command: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: normalizedPrefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    });
    
    const result = await client.send(command);
    if (result.Contents) {
      allObjects.push(...result.Contents);
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  
  return allObjects;
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

export async function deleteFolder(bucketId: string, prefix: string) {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const normalizedPrefix = prefix.endsWith("/") ? prefix : prefix + "/";
  
  let continuationToken: string | undefined = undefined;
  let totalDeleted = 0;
  
  do {
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: normalizedPrefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    });
    
    const listResult = await client.send(listCommand);
    const objects = listResult.Contents || [];
    
    if (objects.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: config.bucketName,
        Delete: {
          Objects: objects.map(obj => ({ Key: obj.Key! })),
          Quiet: true,
        },
      });
      
      await client.send(deleteCommand);
      totalDeleted += objects.length;
    }
    
    continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
  } while (continuationToken);
  
  const folderCommand = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: normalizedPrefix,
  });
  await client.send(folderCommand);
  
  return { deleted: totalDeleted };
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

export async function getObjectContent(bucketId: string, key: string): Promise<{ body: string; contentType: string | undefined }> {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });
  
  const response = await client.send(command);
  const contentType = response.ContentType;
  const body = await response.Body?.transformToString();
  
  return { body: body || "", contentType };
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
    const message = error instanceof Error ? error.message : "Connection failed";
    
    if (message.includes("No value provided for input HTTP label: Bucket") || message.includes("Bucket name is required")) {
      return { success: false, error: "BUCKET_NAME_REQUIRED" };
    }
    if (message.includes("Could not resolve") || message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
      return { success: false, error: "ENDPOINT_UNREACHABLE" };
    }
    if (message.includes("InvalidAccessKeyId") || message.includes("SignatureDoesNotMatch") || message.includes("access denied") || message.includes("Access Denied")) {
      return { success: false, error: "INVALID_CREDENTIALS" };
    }
    if (message.includes("NoSuchBucket")) {
      return { success: false, error: "BUCKET_NOT_FOUND" };
    }
    if (message.includes("NetworkingError") || message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT")) {
      return { success: false, error: "NETWORK_ERROR" };
    }
    
    return { success: false, error: "CONNECTION_FAILED" };
  }
}

export function getPublicUrl(config: BucketConfig, key: string): string | null {
  if (!config.publicUrl) return null;
  return `${config.publicUrl.replace(/\/$/, "")}/${key}`;
}

export async function uploadObject(bucketId: string, key: string, body: Buffer | Uint8Array, contentType: string) {
  const config = await getBucketConfig(bucketId);
  if (!config) throw new Error("Bucket not found");
  
  const client = createS3Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  
  return client.send(command);
}

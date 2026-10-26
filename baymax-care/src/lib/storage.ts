import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { integrations } from "./config";
import { hmacSignature, verifyHmac } from "./security";

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

function localRoot() {
  return process.env.LOCAL_STORAGE_DIR?.trim()
    ? path.resolve(process.env.LOCAL_STORAGE_DIR)
    : path.join(process.cwd(), ".data", "uploads");
}

function s3Config() {
  return {
    region: integrations.storage.region,
    bucket: integrations.storage.bucket,
    endpoint: integrations.storage.endpoint || undefined,
    accessKeyId: integrations.storage.accessKeyId,
    secretAccessKey: integrations.storage.secretAccessKey,
  };
}

function usingS3() {
  return integrations.storage.driver === "s3";
}

function assertStorageReady() {
  if (!usingS3()) return;
  const s3 = s3Config();
  if (!s3.region || !s3.bucket || !s3.accessKeyId || !s3.secretAccessKey) {
    throw new StorageUnavailableError(
      "Object storage is selected but not configured. Set S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
    );
  }
}

function resolveLocalPath(storageKey: string) {
  const root = localRoot();
  const resolved = path.resolve(root, storageKey);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}

async function s3Client() {
  assertStorageReady();
  const { S3Client } = await import("@aws-sdk/client-s3");
  const s3 = s3Config();
  return new S3Client({
    region: s3.region,
    endpoint: s3.endpoint,
    forcePathStyle: Boolean(s3.endpoint),
    credentials: {
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
    },
  });
}

export async function savePrivateFile({
  buffer,
  ownerUserId,
}: {
  buffer: Buffer;
  ownerUserId: string;
}) {
  assertStorageReady();
  const storageKey = `${ownerUserId}/${crypto.randomUUID()}`;
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  if (usingS3()) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: s3Config().bucket,
        Key: storageKey,
        Body: buffer,
        ContentLength: buffer.byteLength,
        ContentType: "application/octet-stream",
        ServerSideEncryption: "AES256",
      }),
    );
    return { storageKey, checksum, sizeBytes: buffer.byteLength, driver: "s3" as const };
  }

  const destination = resolveLocalPath(storageKey);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(temporary, buffer, { mode: 0o600 });
  await fs.rename(temporary, destination);
  return { storageKey, checksum, sizeBytes: buffer.byteLength, driver: "local" as const };
}

export async function readPrivateFile(storageKey: string): Promise<Buffer> {
  assertStorageReady();
  if (usingS3()) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    const response = await client.send(
      new GetObjectCommand({ Bucket: s3Config().bucket, Key: storageKey }),
    );
    if (!response.Body) throw new Error("Stored file has no body.");
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  return fs.readFile(resolveLocalPath(storageKey));
}

export async function deletePrivateFile(storageKey: string) {
  try {
    assertStorageReady();
    if (usingS3()) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await s3Client();
      await client.send(
        new DeleteObjectCommand({ Bucket: s3Config().bucket, Key: storageKey }),
      );
      return;
    }
    await fs.unlink(resolveLocalPath(storageKey));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    throw error;
  }
}

const DOWNLOAD_TTL_SECONDS = 10 * 60;

export function createSignedFilePath(fileId: string, userId: string) {
  const expires = Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SECONDS;
  const signature = hmacSignature(`${fileId}:${userId}:${expires}`, "file-download");
  return `/api/files/${encodeURIComponent(fileId)}?user=${encodeURIComponent(userId)}&expires=${expires}&signature=${signature}`;
}

export function verifySignedFileRequest({
  fileId,
  userId,
  expires,
  signature,
}: {
  fileId: string;
  userId: string;
  expires: string;
  signature: string;
}) {
  const expiry = Number(expires);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;
  return verifyHmac(`${fileId}:${userId}:${expires}`, signature, "file-download");
}

export function storageDescription() {
  if (!usingS3()) return "Local private storage";
  return s3Config().bucket ? `S3 bucket ${s3Config().bucket}` : "S3 not fully configured";
}

export function storageIsConfigured() {
  if (!usingS3()) return true;
  const s3 = s3Config();
  return Boolean(s3.region && s3.bucket && s3.accessKeyId && s3.secretAccessKey);
}

import "server-only";

import crypto from "node:crypto";
import { serverConfig } from "./config";

const DEV_FALLBACK_KEY = "baymax-care-local-only-encryption-key-change-me";

function secret() {
  const value = serverConfig.sessionSecret;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return "baymax-care-development-session-secret";
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashToken(raw: string) {
  return crypto.createHmac("sha256", secret()).update(raw).digest("hex");
}

export function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashEmail(email: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export function hashIp(ip: string) {
  return crypto.createHmac("sha256", secret()).update(ip).digest("hex").slice(0, 32);
}

export function constantTimeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function hmacSignature(payload: string, purpose = "file") {
  return crypto
    .createHmac("sha256", `${secret()}:${purpose}`)
    .update(payload)
    .digest("base64url");
}

export function verifyHmac(
  payload: string,
  signature: string,
  purpose = "file",
) {
  const expected = hmacSignature(payload, purpose);
  return constantTimeEqual(expected, signature);
}

function encryptionKey() {
  const configured = serverConfig.encryptionKey;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_ENCRYPTION_KEY is required in production.");
    }
    return crypto.createHash("sha256").update(DEV_FALLBACK_KEY).digest();
  }
  const decoded = Buffer.from(configured, "base64");
  if (decoded.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return decoded;
}

/** AES-256-GCM envelope used for free-text fields kept outside the core record model. */
export function encryptText(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptText(payload: string | null | undefined): string | null {
  if (!payload) return null;
  if (!payload.startsWith("enc:v1:")) return null;
  try {
    const [, , ivPart, tagPart, dataPart] = payload.split(":");
    if (!ivPart || !tagPart || !dataPart) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function signWebhook(payload: Buffer, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhook(payload: Buffer, signature: string, secret: string) {
  if (!secret || !signature) return false;
  const expected = signWebhook(payload, secret);
  return constantTimeEqual(expected, signature);
}

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

export type Stored = { bytes: Uint8Array; etag: string };
export interface Storage {
  get(key: string): Promise<Stored | null>;
  put(key: string, bytes: Uint8Array, type: string, condition?: { match?: string; absent?: boolean }): Promise<void>;
  remove(key: string): Promise<void>;
  list(prefix: string): Promise<{ key: string; modified: number }[]>;
}
export class Conflict extends Error {}
export const bytes = (s: string) => new TextEncoder().encode(s);
export const text = (s: Stored) => new TextDecoder().decode(s.bytes);
export class R2Storage implements Storage {
  private client: S3Client;
  private bucket: string;
  constructor() {
    const required = (key: string) => { const v = process.env[key]; if (!v) throw new Error(`Missing ${key}`); return v; };
    const account = required("BLOG_R2_ACCOUNT_ID");
    if (!/^[a-f0-9]{32}$/.test(account)) throw new Error("Invalid BLOG_R2_ACCOUNT_ID");
    this.bucket = required("BLOG_R2_BUCKET");
    this.client = new S3Client({
      region: "auto", endpoint: `https://${account}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: required("BLOG_R2_ACCESS_KEY_ID"), secretAccessKey: required("BLOG_R2_SECRET_ACCESS_KEY") },
      maxAttempts: 3, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  async get(key: string): Promise<Stored | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(30_000) });
      if (!result.Body || !result.ETag) throw new Error("Missing R2 body or ETag");
      return { bytes: await result.Body.transformToByteArray(), etag: result.ETag };
    } catch (e) { if ((e as { name: string }).name === "NoSuchKey") return null; throw e; }
  }
  async put(key: string, body: Uint8Array, type: string, condition?: { match?: string; absent?: boolean }) {
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket, Key: key, Body: body, ContentType: type,
        CacheControl: key.startsWith("blog/objects/") ? "public, max-age=300" : "no-store",
        IfMatch: condition?.match, IfNoneMatch: condition?.absent ? "*" : undefined,
      }), { abortSignal: AbortSignal.timeout(30_000) });
    } catch (e) {
      const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 412 || status === 409) throw new Conflict("Remote state changed or another publishing command holds the lock. Replan; do not force overwrite.");
      throw e;
    }
  }
  async remove(key: string) { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: AbortSignal.timeout(30_000) }); }
  async list(prefix: string) {
    const items: { key: string; modified: number }[] = [];
    let token: string | undefined;
    do {
      const page = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }), { abortSignal: AbortSignal.timeout(30_000) });
      for (const item of page.Contents || []) if (item.Key && item.LastModified) items.push({ key: item.Key, modified: item.LastModified.getTime() });
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return items;
  }
}

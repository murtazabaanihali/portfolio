import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

/** Raw bytes and ETag metadata returned by a storage read. */
export type Stored = { bytes: Uint8Array; etag: string };

/** Abstract storage interface for blog content and manifests. */
export interface Storage {
  /** Fetch an object by key, or return null if it does not exist. */
  get(key: string): Promise<Stored | null>;

  /**
   * Put an object with content type and optional conditional match (If-Match / If-None-Match).
   * Throws `Conflict` if conditional check fails.
   */
  put(
    key: string,
    bytes: Uint8Array,
    type: string,
    condition?: { match?: string; absent?: boolean },
  ): Promise<void>;

  /** Remove an object by key. */
  remove(key: string): Promise<void>;

  /** List objects starting with a given prefix. */
  list(prefix: string): Promise<{ key: string; modified: number }[]>;
}

/** Thrown when a conditional storage write fails due to remote state changes or lock collision. */
export class Conflict extends Error {}

/** Encode a string into UTF-8 bytes. */
export const bytes = (s: string) => new TextEncoder().encode(s);

/** Decode UTF-8 bytes from a Stored object into a string. */
export const text = (s: Stored) => new TextDecoder().decode(s.bytes);

/** Cloudflare R2 implementation using S3-compatible client. */
export class R2Storage implements Storage {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const required = (key: string) => {
      const v = process.env[key];
      if (!v) throw new Error(`Missing ${key}`);
      return v;
    };

    const endpoint = required("CLOUDFLARE_R2_ENDPOINT");
    this.bucket = required("CLOUDFLARE_R2_BUCKET");

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: required("CLOUDFLARE_R2_ACCESS_KEY_ID"),
        secretAccessKey: required("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
      },
      maxAttempts: 3,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  /** Retrieve an object and its ETag from R2. Returns null on NoSuchKey. */
  async get(key: string): Promise<Stored | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
      if (!result.Body || !result.ETag) {
        throw new Error("Missing R2 body or ETag");
      }
      return {
        bytes: await result.Body.transformToByteArray(),
        etag: result.ETag,
      };
    } catch (e) {
      if ((e as { name: string }).name === "NoSuchKey") {
        return null;
      }
      throw e;
    }
  }

  /** Put an object to R2 with optional conditional matching for optimistic concurrency. */
  async put(
    key: string,
    body: Uint8Array,
    type: string,
    condition?: { match?: string; absent?: boolean },
  ): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: type,
          CacheControl: key.startsWith("blog/objects/")
            ? "public, max-age=300"
            : "no-store",
          IfMatch: condition?.match,
          IfNoneMatch: condition?.absent ? "*" : undefined,
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
    } catch (e) {
      const status = (e as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 412 || status === 409) {
        throw new Conflict(
          "Remote state changed or another publishing command holds the lock. Replan; do not force overwrite.",
        );
      }
      throw e;
    }
  }

  /** Delete an object from R2. */
  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      { abortSignal: AbortSignal.timeout(30_000) },
    );
  }

  /** List all objects matching prefix across paginated results. */
  async list(prefix: string): Promise<{ key: string; modified: number }[]> {
    const items: { key: string; modified: number }[] = [];
    let token: string | undefined;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );

      for (const item of page.Contents || []) {
        if (item.Key && item.LastModified) {
          items.push({
            key: item.Key,
            modified: item.LastModified.getTime(),
          });
        }
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);

    return items;
  }
}

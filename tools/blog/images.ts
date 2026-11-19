import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { imageNodes, localImagePath } from "../../lib/blog/contract";

/** Calculate SHA-256 hash of byte buffer or string. */
export function hash(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Validate raster image format from magic numbers. */
export function imageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  throw new Error("Invalid image: only raster PNG, JPEG, or WebP accepted");
}

export type InlineImage = {
  bytes: Uint8Array;
  type: "image/png" | "image/jpeg" | "image/webp";
  filename: string;
};

/** Read referenced inline images from markdown body without following symlinks. */
export async function readInlineImages(
  baseDir: string,
  body: string,
): Promise<Record<string, InlineImage>> {
  const images: Record<string, InlineImage> = {};
  const paths = [...new Set(imageNodes(body).map((n) => n.url).filter(localImagePath))].sort();

  if (paths.length > 50) {
    throw new Error("At most 50 inline images per article allowed");
  }

  let totalSize = 0;
  for (const src of paths) {
    const filename = src.replace(/^\.\/images\//, "");
    const fullPath = join(baseDir, "images", filename);

    const fileStat = await stat(fullPath).catch(() => {
      throw new Error(`Referenced inline image not found: ${src} (checked ${fullPath})`);
    });

    if (!fileStat.isFile()) {
      throw new Error(`Inline image must be a regular file: ${src}`);
    }

    if (fileStat.size > 10 * 1024 * 1024) {
      throw new Error(`Inline image exceeds 10MB limit: ${src}`);
    }

    totalSize += fileStat.size;
    if (totalSize > 50 * 1024 * 1024) {
      throw new Error("Inline images exceed 50MB total limit");
    }

    const data = await readFile(fullPath);
    const type = imageType(data);
    images[src] = { bytes: data, type, filename };
  }

  return images;
}

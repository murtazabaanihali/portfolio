import { readFile, writeFile, stat, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import sharp from "sharp";
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

export type CompressOptions = {
  maxWidth?: number;
  quality?: number;
  effort?: number;
};

/**
 * Default maximum width for blog images.
 * The blog article container is max-w-3xl (768px) with 32px padding (704px content width).
 * 1000px provides ~1.42x device pixel ratio for crisp Retina rendering while keeping payload sizes minimal.
 */
export const DEFAULT_MAX_IMAGE_WIDTH = 1000;
export const DEFAULT_IMAGE_QUALITY = 70;
export const DEFAULT_IMAGE_EFFORT = 6;

export type CompressedImageResult = {
  bytes: Uint8Array;
  type: "image/webp";
  ext: ".webp";
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
};

/**
 * Compress and convert a raster image to WebP using sharp with responsive dimensions.
 * Does not enlarge images smaller than maxWidth.
 */
export async function compressImage(
  data: Uint8Array | Buffer,
  options?: CompressOptions,
): Promise<CompressedImageResult> {
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_IMAGE_WIDTH;
  const quality = options?.quality ?? DEFAULT_IMAGE_QUALITY;
  const effort = options?.effort ?? DEFAULT_IMAGE_EFFORT;

  const originalSize = data.byteLength;
  const pipeline = sharp(data)
    .rotate()
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort,
    });

  const { data: outputBuffer, info } = await pipeline.toBuffer({
    resolveWithObject: true,
  });

  return {
    bytes: new Uint8Array(outputBuffer),
    type: "image/webp",
    ext: ".webp",
    width: info.width,
    height: info.height,
    originalSize,
    compressedSize: outputBuffer.byteLength,
  };
}

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

export type CompressTargetResult = {
  file: string;
  output: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  reduction: string;
  status: "ok";
};

export type CompressSummary = {
  total: number;
  processed: number;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  reduction: string;
  results: CompressTargetResult[];
  updatedMarkdown?: string;
};

/**
 * Compress an image file or all images in a blog directory to WebP with responsive dimensions.
 * If target is a directory containing a post.md, automatically updates Markdown references to point to .webp.
 */
export async function compressFileOrDir(
  targetPath: string,
  options?: CompressOptions & { outputPath?: string },
): Promise<CompressSummary> {
  const fileStat = await stat(targetPath).catch(() => {
    throw new Error(`Target path not found: ${targetPath}`);
  });

  const results: CompressTargetResult[] = [];

  if (fileStat.isFile()) {
    const rawBytes = await readFile(targetPath);
    const compressed = await compressImage(rawBytes, options);
    const outPath =
      options?.outputPath ||
      targetPath.replace(/\.[^.]+$/, "") + compressed.ext;

    await writeFile(outPath, compressed.bytes);

    const saved = compressed.originalSize - compressed.compressedSize;
    const reductionPercent =
      compressed.originalSize > 0
        ? ((saved / compressed.originalSize) * 100).toFixed(1) + "%"
        : "0%";

    const item: CompressTargetResult = {
      file: targetPath,
      output: outPath,
      width: compressed.width,
      height: compressed.height,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      savedBytes: Math.max(0, saved),
      reduction: reductionPercent,
      status: "ok",
    };
    results.push(item);

    return {
      total: 1,
      processed: 1,
      originalBytes: compressed.originalSize,
      compressedBytes: compressed.compressedSize,
      savedBytes: Math.max(0, saved),
      reduction: reductionPercent,
      results,
    };
  }

  if (!fileStat.isDirectory()) {
    throw new Error(`Target must be a regular file or directory: ${targetPath}`);
  }

  // Directory handling: look for images
  const entries = await readdir(targetPath, { withFileTypes: true });
  const imageFiles: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)) {
      imageFiles.push(join(targetPath, entry.name));
    }
  }

  const imagesSubdir = join(targetPath, "images");
  const subStat = await stat(imagesSubdir).catch(() => null);
  if (subStat?.isDirectory()) {
    const subEntries = await readdir(imagesSubdir, { withFileTypes: true });
    for (const sub of subEntries) {
      if (sub.isFile() && /\.(png|jpe?g|webp)$/i.test(sub.name)) {
        imageFiles.push(join(imagesSubdir, sub.name));
      }
    }
  }

  if (imageFiles.length === 0) {
    return {
      total: 0,
      processed: 0,
      originalBytes: 0,
      compressedBytes: 0,
      savedBytes: 0,
      reduction: "0%",
      results: [],
    };
  }

  let totalOrig = 0;
  let totalComp = 0;

  for (const imgPath of imageFiles) {
    const rawBytes = await readFile(imgPath);
    const compressed = await compressImage(rawBytes, options);
    const outPath = imgPath.replace(/\.[^.]+$/, "") + compressed.ext;

    await writeFile(outPath, compressed.bytes);

    const saved = compressed.originalSize - compressed.compressedSize;
    const reductionPercent =
      compressed.originalSize > 0
        ? ((saved / compressed.originalSize) * 100).toFixed(1) + "%"
        : "0%";

    totalOrig += compressed.originalSize;
    totalComp += compressed.compressedSize;

    results.push({
      file: imgPath,
      output: outPath,
      width: compressed.width,
      height: compressed.height,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      savedBytes: Math.max(0, saved),
      reduction: reductionPercent,
      status: "ok",
    });
  }

  let updatedMarkdown: string | undefined;
  const postMdPath = join(targetPath, "post.md");
  const postStat = await stat(postMdPath).catch(() => null);
  if (postStat?.isFile()) {
    let md = await readFile(postMdPath, "utf8");
    md = md.replace(
      /(cover:\s*[\r\n]+\s*src:\s*["']?\.\/cover)\.(?:png|jpe?g|webp)(["']?)/g,
      "$1.webp$2",
    );
    md = md.replace(
      /(\.\/images\/[a-zA-Z0-9_-]+)\.(?:png|jpe?g)(["')\s])/g,
      "$1.webp$2",
    );
    await writeFile(postMdPath, md, "utf8");
    updatedMarkdown = postMdPath;
  }

  const totalSaved = totalOrig - totalComp;
  const totalReduction =
    totalOrig > 0 ? ((totalSaved / totalOrig) * 100).toFixed(1) + "%" : "0%";

  return {
    total: imageFiles.length,
    processed: results.length,
    originalBytes: totalOrig,
    compressedBytes: totalComp,
    savedBytes: Math.max(0, totalSaved),
    reduction: totalReduction,
    results,
    updatedMarkdown,
  };
}

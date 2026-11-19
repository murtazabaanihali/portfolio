#!/usr/bin/env bun
import { readFile, stat } from "node:fs/promises";
import { parseArgs } from "node:util";
import {
  BlogService,
  findPostsInDir,
  type BulkPublishItem,
} from "./core";
import { R2Storage, Conflict } from "./storage";
import { migrateBlogs } from "./migrate";

const help = `Blog Publishing CLI for Agents
Usage: bun run blog <command> [arguments] [options]

Commands:
  publish <post.md...> [--cover <image>]  Publish one or more posts directly to R2
  publish <directory>                    Bulk publish all posts found in a directory
  publish --batch <batch.json>           Bulk publish from a JSON array of files
  publish-batch <batch.json>             Alias for bulk publish from batch JSON
  list                                   List all published posts
  unpublish <slug> --yes                 Unpublish a post (removes from manifest)
  delete <slug> --yes                    Permanently delete a post and its files
  migrate [--yes] [--dry-run]            Migrate legacy blog/objects/ to blog/posts/<slug>/
  init --yes                             Initialize empty blog manifest in R2
  lock-status                            Check active publishing lock
  unlock [owner] --yes [--force]         Release publishing lock

Examples:
  # Publish single post:
  bun run blog publish ./my-post/post.md --cover ./my-post/cover.png
  bun run blog publish ./my-post/post.md (uses frontmatter cover.src)

  # Bulk publish multiple files:
  bun run blog publish ./post1.md ./post2.md ./post3.md

  # Bulk publish an entire folder of articles:
  bun run blog publish ./articles/

  # Bulk publish via batch JSON:
  bun run blog publish --batch ./batch.json
  # batch.json format: ["./p1/post.md", "./p2/post.md"]
  # or: [{ "file": "./p1/post.md", "cover": "./p1/cover.png" }]

All commands return clean JSON. Errors are written to stderr.
Exit codes: 0 success; 1 failure; 2 invalid input; 3 state conflict; 4 missing authorization.
`;

async function main() {
  const args = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      yes: { type: "boolean" },
      "dry-run": { type: "boolean" },
      cover: { type: "string" },
      batch: { type: "string" },
      force: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  const [command, ...ids] = args.positionals;
  const options = args.values;

  if (!command || options.help || command === "help") {
    console.log(help);
    return;
  }

  const requireYes = () => {
    if (!options.yes) {
      process.exitCode = 4;
      throw new Error("Explicit --yes required for this operation");
    }
  };

  const required = (index = 0, name = "argument") => {
    if (!ids[index]) {
      process.exitCode = 2;
      throw new Error(`Missing ${name}`);
    }
    return ids[index];
  };

  const storage = new R2Storage();
  const service = new BlogService(storage);
  let result: unknown;

  switch (command) {
    case "publish-batch":
    case "publish": {
      let items: BulkPublishItem[] = [];

      if (options.batch || command === "publish-batch") {
        const batchFile = options.batch || required(0, "batch json file");
        const parsed = JSON.parse(await readFile(batchFile, "utf8"));
        if (!Array.isArray(parsed)) {
          throw new Error("Batch file must contain a JSON array");
        }
        items = parsed.map((item: any) =>
          typeof item === "string"
            ? { file: item }
            : { file: item.file, cover: item.cover },
        );
      } else if (ids.length > 1) {
        items = ids.map((file) => ({ file }));
      } else if (ids.length === 1) {
        const target = ids[0];
        const targetStat = await stat(target).catch(() => null);
        if (targetStat?.isDirectory()) {
          const files = await findPostsInDir(target);
          if (!files.length) {
            throw new Error(
              `No blog post markdown files found in directory: ${target}`,
            );
          }
          items = files.map((file) => ({ file }));
        } else {
          // Single file publish with optional --cover
          result = await service.publish(target, { coverPath: options.cover });
          break;
        }
      } else {
        throw new Error(
          "Missing post file, directory, or --batch to publish",
        );
      }

      const bulkResult = await service.publishBulk(items);
      result = bulkResult;
      if (bulkResult.failed > 0) {
        process.exitCode = 1;
      }
      break;
    }

    case "list": {
      result = await service.list();
      break;
    }

    case "unpublish": {
      requireYes();
      const slug = required(0, "post slug");
      result = await service.unpublish(slug);
      break;
    }

    case "delete": {
      requireYes();
      const slug = required(0, "post slug");
      result = await service.deletePost(slug);
      break;
    }

    case "migrate": {
      result = await migrateBlogs(storage, {
        yes: options.yes,
        dryRun: options["dry-run"],
      });
      break;
    }

    case "init": {
      requireYes();
      result = await service.initialize();
      break;
    }

    case "lock-status": {
      result = await service.lockStatus();
      break;
    }

    case "unlock": {
      requireYes();
      const owner = ids[0];
      await service.releaseLock(owner, Boolean(options.force));
      result = { success: true, unlocked: true };
      break;
    }

    default: {
      process.exitCode = 2;
      throw new Error(`Unknown command "${command}". Use --help for usage.`);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  if (error instanceof Conflict) {
    process.exitCode = 3;
  } else if (!process.exitCode) {
    process.exitCode =
      error?.name === "ZodError" ||
      error?.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION"
        ? 2
        : 1;
  }
  console.error(
    JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      exitCode: process.exitCode,
    }),
  );
});

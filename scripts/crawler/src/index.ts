import { readFile } from "node:fs/promises";
import { computeTaskInputHash } from "@/lib/crawler/service";
import { createCrawlTask, finishCrawlTask } from "@/lib/crawler/service";
import { importCrawlCandidates } from "@/lib/crawler/ingest";
import { collectWithPlaywright } from "@/lib/crawler/playwright-provider";
import { crawlManifestSchema, selectorManifestSchema } from "@/lib/crawler/types";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const manifestPath = argument("--manifest");
  const selectorManifestPath = argument("--selector-manifest");
  const dryRun = process.argv.includes("--dry-run");
  if ((!manifestPath && !selectorManifestPath) || (manifestPath && selectorManifestPath)) {
    console.error("Usage: pnpm crawler --manifest <manifest.json> [--dry-run]");
    console.error("   or: pnpm crawler --selector-manifest <selectors.json> [--dry-run]");
    process.exitCode = 1;
    return;
  }

  const rawInput = await readFile((manifestPath ?? selectorManifestPath)!, "utf8");
  const rawJson: unknown = JSON.parse(rawInput);
  const directManifest = manifestPath ? crawlManifestSchema.safeParse(rawJson) : null;
  const selectorManifest = selectorManifestPath ? selectorManifestSchema.safeParse(rawJson) : null;
  const validationError = directManifest && !directManifest.success
    ? directManifest.error
    : selectorManifest && !selectorManifest.success
      ? selectorManifest.error
      : null;
  if (validationError) {
    console.error("采集清单格式不合法：", validationError.issues);
    process.exitCode = 1;
    return;
  }

  const directData = directManifest?.success ? directManifest.data : null;
  const selectorData = selectorManifest?.success ? selectorManifest.data : null;
  const provider = directData?.provider ?? selectorData!.provider;
  const version = directData?.version ?? selectorData!.version;
  if (dryRun) {
    console.log(JSON.stringify({ provider, version, ...(directData ? { candidates: directData.items.length } : { pages: selectorData!.pages.length }) }, null, 2));
    return;
  }

  const candidates = directData?.items ?? await collectWithPlaywright(selectorData!);
  const inputHash = computeTaskInputHash(rawInput);
  const taskId = await createCrawlTask({ provider, version, rawInput, inputHash });
  try {
    const result = await importCrawlCandidates(taskId, candidates);
    await finishCrawlTask({ id: taskId, candidateCount: candidates.length, ...result });
    console.log(JSON.stringify({ taskId, ...result }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知采集任务错误。";
    await finishCrawlTask({ id: taskId, candidateCount: candidates.length, importedCount: 0, duplicateCount: 0, error: message });
    throw error;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

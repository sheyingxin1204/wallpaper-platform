import { processWallpaper } from "@/lib/wallpapers/processor";
import { getPendingProcessingIds } from "@/lib/wallpapers/service";

const wallpaperId = process.argv[2];

if (wallpaperId === "--all") {
  const parsedLimit = Number.parseInt(process.argv[3] ?? "50", 10);
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 50;
  getPendingProcessingIds(limit)
    .then(async (items) => {
      let failures = 0;
      for (const item of items) {
        try {
          await processWallpaper(item.id);
          console.log(`Processed wallpaper ${item.id}.`);
        } catch (error) {
          failures += 1;
          console.error(`Failed to process wallpaper ${item.id}.`, error);
        }
      }
      if (failures) process.exitCode = 1;
      console.log(`Processed ${items.length - failures}/${items.length} queued wallpapers.`);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
} else if (!wallpaperId) {
  console.error("Usage: pnpm processor <wallpaper-id> | pnpm processor --all [limit]");
  process.exitCode = 1;
} else {
  processWallpaper(wallpaperId)
    .then(() => console.log(`Processed wallpaper ${wallpaperId}.`))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}

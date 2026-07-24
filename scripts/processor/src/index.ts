import { processWallpaper } from "@/lib/wallpapers/processor";

const wallpaperId = process.argv[2];

if (!wallpaperId) {
  console.error("Usage: pnpm processor <wallpaper-id>");
  process.exitCode = 1;
} else {
  processWallpaper(wallpaperId)
    .then(() => console.log(`Processed wallpaper ${wallpaperId}.`))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}

import type { wallpaperStatuses } from "@/db/schema";

export type WallpaperStatus = (typeof wallpaperStatuses)[number];

const transitions: Record<WallpaperStatus, readonly WallpaperStatus[]> = {
  draft: ["pending_processing", "rejected"],
  pending_processing: ["pending_review", "rejected"],
  pending_review: ["published", "rejected"],
  published: ["unlisted"],
  unlisted: [],
  rejected: [],
};

export function canTransition(from: WallpaperStatus, to: WallpaperStatus) {
  return transitions[from].includes(to);
}

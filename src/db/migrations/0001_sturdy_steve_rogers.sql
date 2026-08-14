ALTER TABLE `wallpapers` ADD `source_sha256` char(64);--> statement-breakpoint
CREATE INDEX `wallpapers_source_sha256_index` ON `wallpapers` (`source_sha256`);
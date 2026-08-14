CREATE TABLE `crawl_records` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`page_url` varchar(2048) NOT NULL,
	`image_url` varchar(2048) NOT NULL,
	`title` varchar(200) NOT NULL,
	`author` varchar(160),
	`license_type` varchar(120) NOT NULL,
	`license_evidence_url` varchar(2048),
	`license_notes` text,
	`status` enum('queued','imported','duplicate','failed') NOT NULL DEFAULT 'queued',
	`wallpaper_id` varchar(36),
	`source_sha256` char(64),
	`error` text,
	`captured_at` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crawl_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `crawl_records_task_page_unique` UNIQUE(`task_id`,`page_url`)
);
--> statement-breakpoint
CREATE TABLE `crawl_tasks` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(120) NOT NULL,
	`provider_version` varchar(40) NOT NULL,
	`input` longtext,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`candidate_count` int NOT NULL DEFAULT 0,
	`imported_count` int NOT NULL DEFAULT 0,
	`duplicate_count` int NOT NULL DEFAULT 0,
	`error` text,
	`started_at` datetime NOT NULL,
	`finished_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crawl_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `crawl_records` ADD CONSTRAINT `crawl_records_task_id_crawl_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `crawl_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crawl_records` ADD CONSTRAINT `crawl_records_wallpaper_id_wallpapers_id_fk` FOREIGN KEY (`wallpaper_id`) REFERENCES `wallpapers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `crawl_records_task_id_index` ON `crawl_records` (`task_id`);--> statement-breakpoint
CREATE INDEX `crawl_records_source_sha256_index` ON `crawl_records` (`source_sha256`);--> statement-breakpoint
CREATE INDEX `crawl_tasks_status_index` ON `crawl_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `crawl_tasks_provider_index` ON `crawl_tasks` (`provider`);
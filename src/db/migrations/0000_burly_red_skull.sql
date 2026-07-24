CREATE TABLE `accounts` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` longtext,
	`refresh_token` longtext,
	`id_token` longtext,
	`access_token_expires_at` datetime,
	`refresh_token_expires_at` datetime,
	`scope` varchar(1024),
	`password` varchar(512),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_provider_account_unique` UNIQUE(`provider_id`,`account_id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` varchar(36) NOT NULL,
	`type` varchar(120) NOT NULL,
	`evidence_url` varchar(2048),
	`notes` text,
	`confirmed_at` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `licenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`expires_at` datetime NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`ip_address` varchar(64),
	`user_agent` varchar(512),
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`original_url` varchar(2048) NOT NULL,
	`author` varchar(160),
	`captured_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` varchar(2048),
	`role` enum('admin') NOT NULL DEFAULT 'admin',
	`disabled` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` varchar(512) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallpaper_assets` (
	`id` varchar(36) NOT NULL,
	`wallpaper_id` varchar(36) NOT NULL,
	`kind` enum('original','preview_1920','preview_960','thumbnail_480') NOT NULL,
	`storage_key` varchar(512) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`width` int,
	`height` int,
	`byte_size` bigint,
	`sha256` char(64),
	`perceptual_hash` char(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallpaper_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallpaper_assets_kind_unique` UNIQUE(`wallpaper_id`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `wallpaper_audit_logs` (
	`id` varchar(36) NOT NULL,
	`wallpaper_id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`action` varchar(80) NOT NULL,
	`from_status` enum('draft','pending_processing','pending_review','published','unlisted','rejected'),
	`to_status` enum('draft','pending_processing','pending_review','published','unlisted','rejected'),
	`reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallpaper_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallpaper_tags` (
	`wallpaper_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	CONSTRAINT `wallpaper_tags_wallpaper_id_tag_id_pk` PRIMARY KEY(`wallpaper_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `wallpapers` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`status` enum('draft','pending_processing','pending_review','published','unlisted','rejected') NOT NULL DEFAULT 'draft',
	`orientation` enum('landscape','portrait','square'),
	`width` int,
	`height` int,
	`dominant_color` char(7),
	`category_id` varchar(36),
	`source_id` varchar(36),
	`license_id` varchar(36),
	`created_by` varchar(36) NOT NULL,
	`published_at` datetime,
	`processing_error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallpapers_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallpapers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpaper_assets` ADD CONSTRAINT `wallpaper_assets_wallpaper_id_wallpapers_id_fk` FOREIGN KEY (`wallpaper_id`) REFERENCES `wallpapers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpaper_audit_logs` ADD CONSTRAINT `wallpaper_audit_logs_wallpaper_id_wallpapers_id_fk` FOREIGN KEY (`wallpaper_id`) REFERENCES `wallpapers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpaper_audit_logs` ADD CONSTRAINT `wallpaper_audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpaper_tags` ADD CONSTRAINT `wallpaper_tags_wallpaper_id_wallpapers_id_fk` FOREIGN KEY (`wallpaper_id`) REFERENCES `wallpapers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpaper_tags` ADD CONSTRAINT `wallpaper_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpapers` ADD CONSTRAINT `wallpapers_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpapers` ADD CONSTRAINT `wallpapers_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpapers` ADD CONSTRAINT `wallpapers_license_id_licenses_id_fk` FOREIGN KEY (`license_id`) REFERENCES `licenses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallpapers` ADD CONSTRAINT `wallpapers_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_id_index` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_index` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sources_original_url_index` ON `sources` (`original_url`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_index` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `wallpaper_assets_sha256_index` ON `wallpaper_assets` (`sha256`);--> statement-breakpoint
CREATE INDEX `wallpaper_audit_logs_wallpaper_id_index` ON `wallpaper_audit_logs` (`wallpaper_id`);--> statement-breakpoint
CREATE INDEX `wallpapers_status_published_at_index` ON `wallpapers` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `wallpapers_category_id_index` ON `wallpapers` (`category_id`);
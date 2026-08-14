ALTER TABLE `crawl_tasks` ADD `input_hash` char(64);--> statement-breakpoint
ALTER TABLE `crawl_tasks` ADD CONSTRAINT `crawl_tasks_input_hash_unique` UNIQUE(`input_hash`);
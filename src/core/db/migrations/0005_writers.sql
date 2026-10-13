CREATE TABLE `writers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`key_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `writers_handle_unique` ON `writers` (`handle`);--> statement-breakpoint
ALTER TABLE `writings` ADD `writer_id` integer REFERENCES writers(id);
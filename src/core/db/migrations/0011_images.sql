CREATE TABLE `images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`writer_id` integer,
	`type` text NOT NULL,
	`bytes` blob NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`writer_id`) REFERENCES `writers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `images_name_unique` ON `images` (`name`);--> statement-breakpoint
CREATE INDEX `images_writer_idx` ON `images` (`writer_id`,`created_at`);
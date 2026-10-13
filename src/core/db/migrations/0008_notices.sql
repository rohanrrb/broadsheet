CREATE TABLE `notices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`writer_id` integer,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`writer_id`) REFERENCES `writers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notices_writer_idx` ON `notices` (`writer_id`);
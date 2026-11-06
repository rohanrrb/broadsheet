CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`writing_id` integer NOT NULL,
	`writer_id` integer NOT NULL,
	`author` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`writing_id`) REFERENCES `writings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`writer_id`) REFERENCES `writers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_writing_idx` ON `comments` (`writing_id`);
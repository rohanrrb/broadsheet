CREATE TABLE `instance` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "instance_single_row" CHECK("instance"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `writing_edits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`writing_id` integer NOT NULL,
	`edited_at` integer NOT NULL,
	`previous_title` text NOT NULL,
	`previous_body` text NOT NULL,
	FOREIGN KEY (`writing_id`) REFERENCES `writings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `writing_edits_writing_idx` ON `writing_edits` (`writing_id`);--> statement-breakpoint
CREATE TABLE `writings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`author` text NOT NULL,
	`created_at` integer NOT NULL,
	`position` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `writings_position_unique` ON `writings` (`position`);
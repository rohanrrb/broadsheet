ALTER TABLE `comments` ADD `parent_id` integer REFERENCES comments(id) ON DELETE cascade;--> statement-breakpoint
ALTER TABLE `comments` ADD `thread_id` integer;--> statement-breakpoint
CREATE INDEX `comments_thread_idx` ON `comments` (`thread_id`);
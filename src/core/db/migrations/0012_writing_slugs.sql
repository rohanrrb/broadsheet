ALTER TABLE `writings` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `writings_writer_slug_idx` ON `writings` (`writer_id`,`slug`);
CREATE TABLE `editor_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editor_sessions_token_hash_unique` ON `editor_sessions` (`token_hash`);
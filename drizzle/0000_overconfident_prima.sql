CREATE TABLE `responses` (
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`owner` text NOT NULL,
	`skill` text NOT NULL,
	`exercise` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `position`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `responses_owner_date` ON `responses` (`owner`,`updated_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`topic_title` text NOT NULL,
	`exercises` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_owner_date` ON `sessions` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);

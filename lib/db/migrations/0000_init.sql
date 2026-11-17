CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`theme` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `kb_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`position` integer NOT NULL,
	`data` text NOT NULL,
	`schema_version` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`location` text NOT NULL,
	`jd_text` text NOT NULL,
	`brief` text NOT NULL,
	`selected` text NOT NULL,
	`source` text NOT NULL,
	`cover_letter_off` integer DEFAULT false NOT NULL,
	`gaps` text,
	`notes` text,
	`schema_version` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`ts` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`coalesce_key` text,
	`snapshot` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

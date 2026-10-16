ALTER TABLE `listings` ADD COLUMN `views` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX `listings_views` ON `listings` (`views`);
--> statement-breakpoint
CREATE TABLE `listing_views` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `listing_views_created` ON `listing_views` (`created`);

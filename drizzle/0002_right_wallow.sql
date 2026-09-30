CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subcategories` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`first_user` text NOT NULL,
	`second_user` text NOT NULL,
	`context_type` text NOT NULL,
	`context_id` text NOT NULL,
	`title` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `conversations_first` ON `conversations` (`first_user`,`updated`);--> statement-breakpoint
CREATE INDEX `conversations_second` ON `conversations` (`second_user`,`updated`);--> statement-breakpoint
CREATE TABLE `email_tokens` (
	`hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`purpose` text NOT NULL,
	`expires` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`listing_id` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `favorites_owner` ON `favorites` (`owner`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text DEFAULT '' NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`price` integer NOT NULL,
	`quantity` integer NOT NULL,
	`condition` text NOT NULL,
	`location` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`delete_token` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `listings_public` ON `listings` (`status`,`created`);--> statement-breakpoint
CREATE INDEX `listings_owner` ON `listings` (`owner`,`status`);--> statement-breakpoint
CREATE INDEX `listings_category` ON `listings` (`category`,`price`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`owner` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_conversation` ON `chat_messages` (`conversation_id`,`created`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`link_type` text DEFAULT '' NOT NULL,
	`link_id` text DEFAULT '' NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_owner` ON `notifications` (`owner`,`read`,`created`);--> statement-breakpoint
CREATE TABLE `seller_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`owner` text NOT NULL,
	`price` integer NOT NULL,
	`description` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `offers_request` ON `seller_offers` (`request_id`);--> statement-breakpoint
CREATE INDEX `offers_owner` ON `seller_offers` (`owner`);--> statement-breakpoint
CREATE TABLE `payment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`purpose` text NOT NULL,
	`quantity` integer NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`listing_id` text DEFAULT '' NOT NULL,
	`amount` integer NOT NULL,
	`reference` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`approval_token` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`verified_at` text,
	`verified_by` text
);
--> statement-breakpoint
CREATE INDEX `payments_owner` ON `payment_requests` (`owner`,`created`);--> statement-breakpoint
CREATE INDEX `payments_status` ON `payment_requests` (`status`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'buyer' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`verified` integer DEFAULT 0 NOT NULL,
	`suspended` integer DEFAULT 0 NOT NULL,
	`extra_slots` integer DEFAULT 0 NOT NULL,
	`used_slots` integer DEFAULT 0 NOT NULL,
	`slot_token` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`listing_id` text NOT NULL,
	`starts` text NOT NULL,
	`expires` text NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `promotions_listing` ON `promotions` (`listing_id`,`status`,`expires`);--> statement-breakpoint
CREATE INDEX `promotions_owner` ON `promotions` (`owner`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`resolution` text DEFAULT '' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_status` ON `reports` (`status`);--> statement-breakpoint
CREATE TABLE `buyer_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`quantity` integer NOT NULL,
	`condition` text NOT NULL,
	`location` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`expiry` text NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`selected_offer` text,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `requests_owner` ON `buyer_requests` (`owner`);--> statement-breakpoint
CREATE INDEX `requests_discovery` ON `buyer_requests` (`status`,`category`,`price`);--> statement-breakpoint
CREATE INDEX `requests_expiry` ON `buyer_requests` (`expiry`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`seller_id` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reviews_seller` ON `reviews` (`seller_id`,`hidden`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `uploads_owner` ON `uploads` (`owner`);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_reference_active_unique` ON `payment_requests` (`reference`) WHERE `status` <> 'Rejected';
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_offer_per_seller_unique` ON `seller_offers` (`request_id`,`owner`) WHERE `status` = 'Pending';

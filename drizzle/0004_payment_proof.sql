ALTER TABLE `payment_requests` ADD COLUMN `method` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payment_requests` ADD COLUMN `sender_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payment_requests` ADD COLUMN `sender_account` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payment_requests` ADD COLUMN `paid_amount` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `payment_requests` ADD COLUMN `paid_on` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payment_requests` ADD COLUMN `receipt` text DEFAULT '' NOT NULL;

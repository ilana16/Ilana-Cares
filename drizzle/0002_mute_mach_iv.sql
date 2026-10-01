CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicName` varchar(80) NOT NULL,
	`rating` int NOT NULL,
	`comment` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reply` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`notificationSentAt` timestamp,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);

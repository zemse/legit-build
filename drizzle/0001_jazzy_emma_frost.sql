CREATE TABLE IF NOT EXISTS "x_following" (
	"viewer_id" text PRIMARY KEY NOT NULL,
	"following_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"truncated" boolean DEFAULT false NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attestations" ADD COLUMN "proof_tweet_id" text;
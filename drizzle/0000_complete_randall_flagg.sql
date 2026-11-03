CREATE TABLE IF NOT EXISTS "attestations" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"project" text NOT NULL,
	"version" text NOT NULL,
	"os_arch" text NOT NULL,
	"source_commit" text NOT NULL,
	"recipe_hash" text NOT NULL,
	"toolchain_hash" text NOT NULL,
	"artifact_hash" text NOT NULL,
	"identity" jsonb NOT NULL,
	"attester" text NOT NULL,
	"raw" jsonb,
	"ref_uid" text,
	"session_uuid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "identity_cache" (
	"address" text PRIMARY KEY NOT NULL,
	"ens" text,
	"fid" integer,
	"fid_followers" bigint,
	"account_age_days" integer,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"forge" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"name" text,
	"layer" text,
	"lang" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "releases" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"tag" text NOT NULL,
	"commit" text,
	"name" text,
	"url" text,
	"prerelease" boolean DEFAULT false NOT NULL,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"uuid" text PRIMARY KEY NOT NULL,
	"upload_token" text NOT NULL,
	"projects" jsonb NOT NULL,
	"instructions" text,
	"state" text DEFAULT 'created' NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seq" integer DEFAULT 0 NOT NULL,
	"ttl" integer DEFAULT 7200 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "releases" ADD CONSTRAINT "releases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attestations_dedupe_idx" ON "attestations" USING btree ("attester","project","version","os_arch","source_commit","artifact_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attestations_subject_idx" ON "attestations" USING btree ("project","version","os_arch");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attestations_artifact_idx" ON "attestations" USING btree ("artifact_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_project_idx" ON "releases" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_published_idx" ON "releases" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_state_idx" ON "sessions" USING btree ("state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" USING btree ("expires_at");
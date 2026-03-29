ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_latitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_longitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_location_accuracy_meters" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_location_recorded_at" timestamp with time zone;

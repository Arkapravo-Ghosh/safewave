ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "latitude" double precision;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "longitude" double precision;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "location_accuracy_meters" real;

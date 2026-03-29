ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'responder';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "owner_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "triggered_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "responders" ADD COLUMN IF NOT EXISTS "user_id" uuid;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_owner_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_owner_admin_id_users_id_fk"
      FOREIGN KEY ("owner_admin_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_triggered_by_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "incidents"
      ADD CONSTRAINT "incidents_triggered_by_user_id_users_id_fk"
      FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'responders_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "responders"
      ADD CONSTRAINT "responders_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "responders_user_id_unique_idx" ON "responders" ("user_id");

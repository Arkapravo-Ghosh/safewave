CREATE TYPE "public"."responder_role" AS ENUM('medical', 'fire', 'security');--> statement-breakpoint
CREATE TYPE "public"."responder_status" AS ENUM('available', 'busy');--> statement-breakpoint
CREATE TYPE "public"."incident_type" AS ENUM('medical', 'fire', 'security', 'custom');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('pending', 'in_progress', 'resolved');--> statement-breakpoint

CREATE TABLE "responders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "role" "responder_role" NOT NULL,
  "status" "responder_status" DEFAULT 'available' NOT NULL,
  "location" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "incidents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "incident_type" NOT NULL,
  "description" text NOT NULL,
  "status" "incident_status" DEFAULT 'pending' NOT NULL,
  "classification_confidence" real DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);--> statement-breakpoint

CREATE TABLE "assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL,
  "responder_id" uuid NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "assignments" ADD CONSTRAINT "assignments_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_responder_id_responders_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."responders"("id") ON DELETE cascade ON UPDATE no action;

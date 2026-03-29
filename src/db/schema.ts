import { type AnyPgColumn, doublePrecision, pgEnum, pgTable, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "responder", "admin", "superadmin"]);

export const responderRoleEnum = pgEnum("responder_role", ["medical", "fire", "security"]);
export const responderStatusEnum = pgEnum("responder_status", ["available", "busy"]);
export const incidentTypeEnum = pgEnum("incident_type", ["medical", "fire", "security", "custom"]);
export const incidentStatusEnum = pgEnum("incident_status", ["pending", "in_progress", "resolved"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").default("user").notNull(),
  ownerAdminId: uuid("owner_admin_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  lastLatitude: doublePrecision("last_latitude"),
  lastLongitude: doublePrecision("last_longitude"),
  lastLocationAccuracyMeters: real("last_location_accuracy_meters"),
  lastLocationRecordedAt: timestamp("last_location_recorded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const responders = pgTable(
  "responders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    role: responderRoleEnum("role").notNull(),
    status: responderStatusEnum("status").default("available").notNull(),
    location: text("location").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    responderUserIdUniqueIdx: uniqueIndex("responders_user_id_unique_idx").on(table.userId),
  })
);

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: incidentTypeEnum("type").notNull(),
  description: text("description").notNull(),
  status: incidentStatusEnum("status").default("pending").notNull(),
  classificationConfidence: real("classification_confidence").default(0).notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  locationAccuracyMeters: real("location_accuracy_meters"),
  triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id")
    .notNull()
    .references(() => incidents.id, { onDelete: "cascade" }),
  responderId: uuid("responder_id")
    .notNull()
    .references(() => responders.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
});

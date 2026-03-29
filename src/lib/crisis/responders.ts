import "server-only";

import { and, asc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { responders, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import type { IncidentType, ResponderRecord } from "@/lib/crisis/types";

export interface ResponderDirectoryItem {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: "medical" | "fire" | "security";
  status: "available" | "busy";
  location: string;
  ownerAdminId: string | null;
  createdAt: string;
}

export async function listResponders(options?: { ownerAdminId?: string }) {
  const rows = await db
    .select({
      responder: responders,
      user: users,
    })
    .from(responders)
    .leftJoin(users, eq(responders.userId, users.id))
    .where(options?.ownerAdminId ? eq(users.ownerAdminId, options.ownerAdminId) : undefined)
    .orderBy(asc(responders.name));

  return rows.map((row) => ({
    id: row.responder.id,
    userId: row.responder.userId,
    name: row.responder.name,
    email: row.user?.email ?? null,
    role: row.responder.role,
    status: row.responder.status,
    location: row.responder.location,
    ownerAdminId: row.user?.ownerAdminId ?? null,
    createdAt: row.responder.createdAt.toISOString(),
  } satisfies ResponderDirectoryItem));
}

export async function findResponderByUserId(userId: string) {
  const row = await db
    .select()
    .from(responders)
    .where(eq(responders.userId, userId))
    .limit(1);

  return row[0] ?? null;
}

export async function createResponderUserForAdmin(input: {
  adminId: string;
  name: string;
  email: string;
  password: string;
  role: "medical" | "fire" | "security";
  location: string;
}) {
  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (existing[0]) {
    throw new Error("A user already exists with this email");
  }

  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const createdUserRows = await tx
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: "responder",
        ownerAdminId: input.adminId,
      })
      .returning();

    const createdUser = createdUserRows[0];

    const createdResponderRows = await tx
      .insert(responders)
      .values({
        userId: createdUser.id,
        name: input.name,
        role: input.role,
        status: "available",
        location: input.location,
      })
      .returning();

    const createdResponder = createdResponderRows[0];

    return {
      id: createdResponder.id,
      userId: createdResponder.userId,
      name: createdResponder.name,
      email: createdUser.email,
      role: createdResponder.role,
      status: createdResponder.status,
      location: createdResponder.location,
      ownerAdminId: createdUser.ownerAdminId,
      createdAt: createdResponder.createdAt.toISOString(),
    } satisfies ResponderDirectoryItem;
  });
}

export async function listAvailableResponders() {
  const rows = await db
    .select({
      id: responders.id,
      userId: responders.userId,
      name: responders.name,
      role: responders.role,
      status: responders.status,
      location: responders.location,
      lastLatitude: users.lastLatitude,
      lastLongitude: users.lastLongitude,
    })
    .from(responders)
    .leftJoin(users, eq(responders.userId, users.id))
    .where(and(eq(responders.status, "available"), isNotNull(responders.userId)));

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    role: row.role,
    status: row.status,
    location: row.location,
    lastLatitude: row.lastLatitude,
    lastLongitude: row.lastLongitude,
  } satisfies ResponderRecord));
}

function haversineMeters(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number }
) {
  const earthRadiusMeters = 6_371_000;
  const leftLatitudeRad = (left.latitude * Math.PI) / 180;
  const rightLatitudeRad = (right.latitude * Math.PI) / 180;
  const deltaLatitudeRad = ((right.latitude - left.latitude) * Math.PI) / 180;
  const deltaLongitudeRad = ((right.longitude - left.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatitudeRad / 2) ** 2 +
    Math.cos(leftLatitudeRad) * Math.cos(rightLatitudeRad) * Math.sin(deltaLongitudeRad / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function mockDistanceScore(from: string, hint: string) {
  const left = from.toLowerCase();
  const right = hint.toLowerCase();

  if (!right) {
    return 50;
  }

  if (left === right) {
    return 100;
  }

  if (left.includes(right) || right.includes(left)) {
    return 80;
  }

  const overlap = left
    .split(/\s+/)
    .filter((token) => token.length > 2 && right.includes(token)).length;

  return Math.max(20, 40 + overlap * 20);
}

export function pickBestResponder(
  availableResponders: ResponderRecord[],
  incidentType: IncidentType,
  locationHint: string,
  targetCoordinates?: { latitude: number; longitude: number }
) {
  const matchingRole =
    incidentType === "custom"
      ? availableResponders
      : availableResponders.filter((responder) => responder.role === incidentType);

  const candidates = matchingRole.length > 0 ? matchingRole : availableResponders;

  return candidates
    .map((responder) => ({
      responder,
      labelScore: mockDistanceScore(responder.location, locationHint),
      hasCoordinateDistance:
        targetCoordinates !== undefined &&
        responder.lastLatitude !== null &&
        responder.lastLongitude !== null,
      distanceMeters:
        targetCoordinates !== undefined &&
        responder.lastLatitude !== null &&
        responder.lastLongitude !== null
          ? haversineMeters(targetCoordinates, {
              latitude: responder.lastLatitude,
              longitude: responder.lastLongitude,
            })
          : Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => {
      if (left.hasCoordinateDistance !== right.hasCoordinateDistance) {
        return left.hasCoordinateDistance ? -1 : 1;
      }

      if (
        left.hasCoordinateDistance &&
        right.hasCoordinateDistance &&
        left.distanceMeters !== right.distanceMeters
      ) {
        return left.distanceMeters - right.distanceMeters;
      }

      if (left.labelScore !== right.labelScore) {
        return right.labelScore - left.labelScore;
      }

      return left.responder.name.localeCompare(right.responder.name);
    })[0]?.responder;
}

export async function setResponderStatus(responderId: string, status: "available" | "busy") {
  await db
    .update(responders)
    .set({ status, updatedAt: new Date() })
    .where(eq(responders.id, responderId));
}

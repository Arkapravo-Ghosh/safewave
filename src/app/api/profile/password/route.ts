import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { findUserById, updateUserPasswordHashById } from "@/lib/auth/users";

export const runtime = "nodejs";

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  nextPassword: z.string().min(8).max(120),
});

export async function POST(request: Request) {
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updatePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await findUserById(session.sub);

  if (!user || !user.passwordHash) {
    return Response.json({ error: "User credentials not found" }, { status: 404 });
  }

  const isCurrentValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);

  if (!isCurrentValid) {
    return Response.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  if (parsed.data.currentPassword === parsed.data.nextPassword) {
    return Response.json({ error: "New password must be different" }, { status: 400 });
  }

  const nextHash = await hashPassword(parsed.data.nextPassword);
  const updatedUser = await updateUserPasswordHashById(user.id, nextHash);

  if (!updatedUser) {
    return Response.json({ error: "Failed to update password" }, { status: 500 });
  }

  return Response.json({ success: true });
}

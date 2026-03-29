import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import { setSession } from "@/lib/auth/session";
import { findUserById, updateUserNameById } from "@/lib/auth/users";

export const runtime = "nodejs";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function GET() {
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(session.sub);

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updatedUser = await updateUserNameById(session.sub, parsed.data.name);

  if (!updatedUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  await setSession({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
  });

  return Response.json({
    profile: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt.toISOString(),
    },
  });
}

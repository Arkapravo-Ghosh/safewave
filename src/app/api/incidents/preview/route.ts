import { z } from "zod";

import { getApiSession } from "@/lib/auth/api-session";
import { planIncidentDispatch } from "@/lib/crisis/dispatch-planner";

export const runtime = "nodejs";

const previewIncidentSchema = z.object({
  description: z.string().max(600).optional(),
});

export async function POST(request: Request) {
  const session = await getApiSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "user") {
    return Response.json({ error: "Only users can preview dispatch" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = previewIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = await planIncidentDispatch({
    description: (parsed.data.description ?? "").trim(),
  });

  return Response.json({ plan });
}

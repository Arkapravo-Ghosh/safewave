"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { ProfileMenu } from "@/components/auth/profile-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRealtimeFeed, type RealtimeEvent } from "@/hooks/use-realtime-feed";
import { formatUtcDate } from "@/lib/date";

interface SuperadminStats {
  triggered: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

interface AdminMeta {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  ownedResponderCount: number;
  activeResponderCount: number;
}

interface SuperadminDashboardClientProps {
  initialAdmins: AdminMeta[];
  initialStats: SuperadminStats;
}

interface RealtimeOverviewPayload {
  admins?: AdminMeta[];
  stats?: SuperadminStats;
  message?: string;
}

interface RoleUpdateResponseUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "responder" | "superadmin";
  createdAt?: string;
}

export function SuperadminDashboardClient({
  initialAdmins,
  initialStats,
}: SuperadminDashboardClientProps) {
  const [admins, setAdmins] = useState<AdminMeta[]>(initialAdmins);
  const [stats, setStats] = useState<SuperadminStats>(initialStats);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("admin");
  const [message, setMessage] = useState("");

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    if (event.event === "system") {
      void (async () => {
        const response = await fetch("/api/superadmin/overview", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          admins: AdminMeta[];
          stats: SuperadminStats;
        };

        setAdmins(payload.admins);
        setStats(payload.stats);
      })();

      return;
    }

    if (event.event === "new_incident") {
      const payload = event.payload as { type?: string; stats?: SuperadminStats };

      if (payload.stats) {
        setStats(payload.stats);
      }

      toast("New emergency reported", {
        description: payload.type ? `Type: ${payload.type}` : undefined,
      });
      return;
    }

    if (event.event === "assignment_update") {
      const payload = event.payload as { responder?: { role?: string | null; name?: string | null } };

      if (payload.responder?.role) {
        toast(`${payload.responder.role} responder assigned`, {
          description: payload.responder.name ?? undefined,
        });
      }
      return;
    }

    if (event.event === "status_update") {
      const payload = event.payload as { status?: string; stats?: SuperadminStats };

      if (payload.stats) {
        setStats(payload.stats);
      }

      if (payload.status) {
        toast(`Incident status updated: ${payload.status.replaceAll("_", " ")}`);
      }
      return;
    }

    if (event.event === "overview_update") {
      const payload = event.payload as RealtimeOverviewPayload;

      if (payload.admins) {
        setAdmins(payload.admins);
      }

      if (payload.stats) {
        setStats(payload.stats);
      }

      if (payload.message) {
        toast(payload.message);
      }
    }
  }, []);

  useRealtimeFeed(handleRealtimeEvent);

  const updateRole = async () => {
    setMessage("");

    const response = await fetch("/api/superadmin/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const payload = (await response.json()) as { error?: string; user?: RoleUpdateResponseUser };

    if (!response.ok) {
      setMessage(payload.error ?? "Failed to update role");
      return;
    }

    const updatedUser = payload.user;

    if (updatedUser) {
      if (role === "admin") {
        setAdmins((previous) => {
          const existing = previous.find((admin) => admin.id === updatedUser.id);

          const nextAdmin: AdminMeta = {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            createdAt: updatedUser.createdAt ?? new Date().toISOString(),
            ownedResponderCount: existing?.ownedResponderCount ?? 0,
            activeResponderCount: existing?.activeResponderCount ?? 0,
          };

          const withoutDuplicate = previous.filter((admin) => admin.id !== updatedUser.id);
          return [nextAdmin, ...withoutDuplicate];
        });
      }

      if (role === "user") {
        setAdmins((previous) => previous.filter((admin) => admin.id !== updatedUser.id));
      }
    }

    setMessage("Role updated successfully.");
    setEmail("");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Superadmin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Admin governance, metadata monitoring, and global incident telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/history" />}>
            Incident History
          </Button>
          <ProfileMenu />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Triggered</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.triggered}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.inProgress}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.resolved}</CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Admin Role Assignment</CardTitle>
          <CardDescription>
            Promote users to admin or demote admins back to user role.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input
            className="sm:col-span-2"
            type="email"
            placeholder="User email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as "user" | "admin")}
          >
            <option value="admin">Assign Admin</option>
            <option value="user">Set as User</option>
          </select>
          <Button className="sm:col-span-3" onClick={updateRole}>
            Apply Role Change
          </Button>
          {message ? <p className="text-sm text-muted-foreground sm:col-span-3">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Metadata</CardTitle>
          <CardDescription>Overview of all admins and the responders they own.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin users assigned yet.</p>
          ) : (
            admins.map((admin) => (
              <div key={admin.id} className="rounded-md border border-border/70 p-3 text-sm">
                {admin.name} ({admin.email}) | responders: {admin.ownedResponderCount} | available: {admin.activeResponderCount} | created: <time dateTime={admin.createdAt}>{formatUtcDate(admin.createdAt)}</time>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}

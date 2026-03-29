"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type RoleKey = "user" | "admin" | "superadmin";

type RoleDashboardShellProps = {
  role: RoleKey;
  title: string;
};

type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

type MetricItem = {
  label: string;
  value: string;
  change: string;
};

type QuickAction = {
  label: string;
  href: string;
  description: string;
};

const MENU_ITEMS: Record<RoleKey, MenuItem[]> = {
  user: [{ label: "Overview", href: "/dashboard", icon: "OV" }],
  admin: [
    { label: "Admin Home", href: "/admin", icon: "AH" },
    { label: "User Dashboard", href: "/dashboard", icon: "UD" },
  ],
  superadmin: [
    { label: "Control Center", href: "/superadmin", icon: "CC" },
    { label: "Admin Dashboard", href: "/admin", icon: "AD" },
    { label: "User Dashboard", href: "/dashboard", icon: "UD" },
  ],
};

const ROLE_LABELS: Record<RoleKey, string> = {
  user: "User",
  admin: "Admin",
  superadmin: "Superadmin",
};

const METRICS: Record<RoleKey, MetricItem[]> = {
  user: [
    { label: "Open Tasks", value: "08", change: "+2 today" },
    { label: "Session Health", value: "99.9%", change: "Stable" },
    { label: "Security Score", value: "A", change: "No issues" },
  ],
  admin: [
    { label: "Active Incidents", value: "03", change: "-1 this hour" },
    { label: "Team Response", value: "4m", change: "Avg triage time" },
    { label: "Coverage", value: "92%", change: "+5% this week" },
  ],
  superadmin: [
    { label: "Org Uptime", value: "99.99%", change: "30-day window" },
    { label: "Policy Drift", value: "01", change: "Needs review" },
    { label: "Global Alerts", value: "12", change: "Across all tenants" },
  ],
};

const QUICK_ACTIONS: Record<RoleKey, QuickAction[]> = {
  user: [
    { label: "Open My Workspace", href: "/dashboard", description: "Continue your regular operational flow." },
    { label: "Back to Landing", href: "/", description: "Return to the public SafeWave home page." },
  ],
  admin: [
    { label: "Go to Admin Home", href: "/admin", description: "Review latest admin-level events and queues." },
    { label: "Inspect User Surface", href: "/dashboard", description: "Preview the user dashboard experience." },
  ],
  superadmin: [
    { label: "Open Control Center", href: "/superadmin", description: "Manage organization-wide operations and policy." },
    { label: "Audit Admin Surface", href: "/admin", description: "Validate controls exposed to admin operators." },
  ],
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard" || href === "/admin" || href === "/superadmin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RoleDashboardShell({ role, title }: RoleDashboardShellProps) {
  const pathname = usePathname();
  const menuItems = MENU_ITEMS[role];
  const metrics = METRICS[role];
  const actions = QUICK_ACTIONS[role];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-2 rounded-md bg-sidebar-primary px-2 py-2 text-sidebar-primary-foreground">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-sidebar-primary-foreground/15 text-xs font-semibold">
              SW
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">SafeWave</span>
              <span className="truncate text-xs text-sidebar-primary-foreground/80">{ROLE_LABELS[role]} Panel</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActivePath(pathname, item.href)}
                      render={<Link href={item.href} />}
                      tooltip={item.label}
                    >
                      <span className="inline-flex size-5 items-center justify-center rounded-sm bg-sidebar-accent text-[10px] font-semibold text-sidebar-accent-foreground">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/" />} tooltip="Home">
                <span className="inline-flex size-5 items-center justify-center rounded-sm bg-sidebar-accent text-[10px] font-semibold text-sidebar-accent-foreground">
                  HM
                </span>
                <span>Back to Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold sm:text-base">{title}</h1>
          </div>
          <Badge variant={role === "user" ? "secondary" : "default"}>{ROLE_LABELS[role]}</Badge>
        </header>

        <main className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,color-mix(in_oklab,var(--primary)_16%,transparent)_0%,transparent_40%),radial-gradient(circle_at_100%_100%,color-mix(in_oklab,var(--chart-2)_14%,transparent)_0%,transparent_35%)]" />

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>{ROLE_LABELS[role]} Mission Brief</CardTitle>
              <CardDescription>
                Your workspace is active. Keep actions focused on security posture and operational response quality.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Alert>
                <AlertTitle>System status is healthy</AlertTitle>
                <AlertDescription>
                  No blocking issues detected in the active {ROLE_LABELS[role].toLowerCase()} workspace.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <section className="grid gap-4 lg:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.label} size="sm">
                <CardHeader>
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-2xl">{metric.value}</CardTitle>
                </CardHeader>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">{metric.change}</p>
                </CardFooter>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Jump to the most relevant surfaces for your role.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {actions.map((action, index) => (
                  <div key={action.label} className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                    <Button variant={index === 0 ? "default" : "outline"} nativeButton={false} render={<Link href={action.href} />}>
                      Open
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Recent checkpoints inside this dashboard context.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Policy sync completed</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
                <Separator />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Alert routing verified</p>
                  <p className="text-xs text-muted-foreground">18 minutes ago</p>
                </div>
                <Separator />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Session token rotated</p>
                  <p className="text-xs text-muted-foreground">53 minutes ago</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

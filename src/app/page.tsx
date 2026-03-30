import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const CAPABILITIES = [
  {
    title: "AI-Powered Emergency Routing",
    description:
      "Share what is happening and SafeWave uses AI to guide your request to the right responders quickly.",
  },
  {
    title: "Live Updates While Help Is Coming",
    description:
      "Stay informed with clear status updates so you know your request has been seen and acted on.",
  },
  {
    title: "Location Sharing When You Need It",
    description:
      "If you allow location access, your position is shared to help responders reach you faster.",
  },
];

const ROLE_PATHS = [
  {
    role: "Need Help",
    route: "/dashboard",
    summary: "Request help, describe your situation, and follow updates until the incident is resolved.",
  },
  {
    role: "Responder",
    route: "/responder",
    summary: "See active emergencies, accept assignments, and update progress from the field.",
  },
  {
    role: "Rescue Team Lead",
    route: "/admin",
    summary: "Coordinate responder teams, monitor emergencies, and keep operations moving.",
  },
  {
    role: "Organization Owner",
    route: "/superadmin",
    summary: "Manage access, oversee teams, and review response activity across the organization.",
  },
];

export default function Home() {
  return (
    <main className="landing-shell relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="landing-shell__atmosphere pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="rounded-full border border-border/70 bg-card/85 px-3 py-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
              SafeWave
            </p>
            <p className="text-xs text-muted-foreground sm:text-sm">
              AI-powered emergency help coordination for people and rescue teams
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
              Team sign in
            </Button>
            <Button nativeButton={false} render={<Link href="/signup" />}>
              Get started
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
          <Card className="landing-shell__hero border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="gap-3">
              <Badge variant="outline" className="w-fit rounded-full border-border/70 bg-background/80 px-3">
                AI-powered help starts here
              </Badge>
              <CardTitle className="text-3xl leading-tight text-balance sm:text-4xl">
                Need help right now? AI-powered SOS guidance connects you to rescue support fast.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base text-muted-foreground text-pretty">
                SafeWave helps people ask for help quickly, then uses AI to route incidents so responders can
                coordinate and act without delay.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-2">
                <Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>
                  Request Help Now
                </Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
                  My Help Dashboard
                </Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/responder" />}>
                  Responder Dashboard
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                  <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Clear emergency status</p>
                  <p className="mt-1 text-sm font-medium">Waiting, in progress, resolved</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                  <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Responder teams</p>
                  <p className="mt-1 text-sm font-medium">Medical, fire, and security</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                  <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">What you can track</p>
                  <p className="mt-1 text-sm font-medium">Response time and progress updates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>How SafeWave Helps</CardTitle>
              <CardDescription>
                A simple flow from your SOS request to on-the-ground response.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-xl border border-border/70 bg-background/75 p-3">
                <p className="text-xs font-medium text-muted-foreground">01 | Send Your SOS</p>
                <p className="mt-1 text-sm">Describe the emergency and share location if available.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 p-3">
                <p className="text-xs font-medium text-muted-foreground">02 | Team Routing</p>
                <p className="mt-1 text-sm">SafeWave AI routes your request to the right responder teams.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 p-3">
                <p className="text-xs font-medium text-muted-foreground">03 | Rescue Teams Respond</p>
                <p className="mt-1 text-sm">Responders receive assignments and begin action.</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/75 p-3">
                <p className="text-xs font-medium text-muted-foreground">04 | Stay Informed</p>
                <p className="mt-1 text-sm">You get updates until the situation is resolved.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="bg-border/70" />

        <section className="grid gap-4 md:grid-cols-3">
          {CAPABILITIES.map((item) => (
            <Card key={item.title} className="border-border/65 bg-card/75 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {ROLE_PATHS.map((path) => (
            <Card key={path.role} className="border-border/65 bg-card/75 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-lg">
                  <span>{path.role}</span>
                  <Badge variant="secondary">{path.route}</Badge>
                </CardTitle>
                <CardDescription>{path.summary}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Card className="border-border/70 bg-card/80 backdrop-blur">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <Badge variant="outline" className="w-fit rounded-full border-border/70 px-3">
                Built for real emergencies
              </Badge>
              <CardTitle className="text-2xl text-balance">Get help faster. Coordinate response better.</CardTitle>
              <CardDescription>
                Start as someone asking for help, or sign in as part of a rescue team.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button variant="outline" nativeButton={false} render={<Link href="/admin" />}>
                Team Lead Dashboard
              </Button>
              <Button nativeButton={false} render={<Link href="/superadmin" />}>
                Organization Console
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ badge, title, description, children }: AuthShellProps) {
  return (
    <main className="auth-shell relative min-h-screen overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="auth-shell__mesh pointer-events-none absolute inset-0" aria-hidden />
      <div className="auth-shell__grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
              SafeWave
            </p>
            <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Back to landing
            </Link>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid items-stretch gap-5 lg:grid-cols-[1.02fr_1fr]">
          <aside className="auth-shell__panel relative hidden overflow-hidden rounded-3xl border border-border/60 bg-card/75 p-7 backdrop-blur lg:flex lg:flex-col lg:justify-between">
            <div className="flex flex-col gap-5">
              <Badge className="w-fit rounded-full bg-primary/12 px-3 text-primary" variant="outline">
                {badge}
              </Badge>
              <h1 className="max-w-md text-4xl leading-tight font-semibold text-balance">{title}</h1>
              <p className="max-w-md text-base text-muted-foreground text-pretty">{description}</p>

              <div className="grid gap-2 text-sm">
                <div className="rounded-xl border border-border/70 bg-background/75 p-3">Send an SOS request in moments</div>
                <div className="rounded-xl border border-border/70 bg-background/75 p-3">Follow live updates while help is on the way</div>
                <div className="rounded-xl border border-border/70 bg-background/75 p-3">Separate spaces for people and rescue teams</div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">You are protected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your account and activity are protected so you can focus on what matters most: getting help fast.
              </p>
            </div>
          </aside>

          <div className="flex flex-col gap-4 lg:justify-center">
            <div className="rounded-2xl border border-border/70 bg-card/75 p-4 backdrop-blur lg:hidden">
              <Badge className="w-fit rounded-full bg-primary/12 px-3 text-primary" variant="outline">
                {badge}
              </Badge>
              <h1 className="mt-3 text-2xl leading-tight font-semibold text-balance">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground text-pretty">{description}</p>
            </div>
            <div className="flex items-center justify-center">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

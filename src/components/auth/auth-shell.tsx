import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

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

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <p className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase backdrop-blur">
            SafeWave
          </p>
          <ThemeToggle />
        </header>

        <section className="grid items-stretch gap-6 lg:grid-cols-[1.05fr_1fr]">
            <aside className="relative hidden overflow-hidden rounded-3xl border border-border/60 bg-card/75 p-8 backdrop-blur lg:flex lg:flex-col lg:justify-between">
              <div className="flex flex-col gap-6">
              <p className="inline-flex w-fit rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                {badge}
              </p>
              <h1 className="max-w-md text-4xl leading-tight font-semibold text-balance">
                {title}
              </h1>
              <p className="max-w-md text-base text-muted-foreground text-pretty">{description}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-border/70 bg-background/75 p-3">JWT sessions</div>
              <div className="rounded-xl border border-border/70 bg-background/75 p-3">Role gates</div>
              <div className="rounded-xl border border-border/70 bg-background/75 p-3">Secure defaults</div>
            </div>
          </aside>

          <div className="flex items-center justify-center">{children}</div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="auth-shell relative min-h-screen overflow-hidden px-4 py-6 sm:px-6">
      <div className="auth-shell__mesh pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-end">
          <ThemeToggle />
        </header>

        <Card className="mx-auto w-full max-w-2xl rounded-3xl border border-border/70 bg-card/90 py-6 shadow-lg shadow-primary/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">SafeWave Crisis Response</CardTitle>
          <CardDescription>
            Trigger incidents, monitor live operations, and coordinate responders in real time.
          </CardDescription>
        </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" nativeButton={false} render={<Link href="/trigger" />}>
              Trigger Emergency
            </Button>
            <Button variant="outline" className="flex-1" nativeButton={false} render={<Link href="/dashboard" />}>
              Live Dashboard
            </Button>
            <Button variant="outline" className="flex-1" nativeButton={false} render={<Link href="/responder" />}>
              Responder Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

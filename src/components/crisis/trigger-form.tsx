"use client";

import { useState } from "react";
import Link from "next/link";

import { ProfileMenu } from "@/components/auth/profile-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CrisisDispatchPlan } from "@/lib/crisis/types";

export function TriggerForm() {
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [dispatchPreview, setDispatchPreview] = useState<CrisisDispatchPlan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<string>("");

  const reviewTrigger = async () => {
    setMessage("");
    setPreviewPending(true);

    try {
      const normalizedDescription = description.trim();

      const response = await fetch("/api/incidents/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: normalizedDescription || undefined,
        }),
      });

      if (!response.ok) {
        setMessage("Failed to generate AI dispatch preview.");
        return;
      }

      const data = (await response.json()) as { plan: CrisisDispatchPlan };
      setDispatchPreview(data.plan);
      setConfirmOpen(true);
    } finally {
      setPreviewPending(false);
    }
  };

  const submitTrigger = async () => {
    setPending(true);
    setMessage("");

    if (!dispatchPreview) {
      setMessage("SafeWave AI dispatch preview is required before sending SOS.");
      setPending(false);
      return;
    }

    setConfirmOpen(false);

    const normalizedDescription = description.trim();

    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: normalizedDescription || undefined,
      }),
    });

    if (!response.ok) {
      setMessage("Failed to send SOS.");
      setPending(false);
      return;
    }

    setDescription("");
    setDispatchPreview(null);
    setMessage("SOS sent. AI dispatch is notifying responders.");
    setPending(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trigger Emergency</h1>
          <p className="text-sm text-muted-foreground">Initiate crisis event and auto-assign response.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
            Dashboard
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/responder" />}>
            Responder Panel
          </Button>
          <ProfileMenu />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Trigger System</CardTitle>
          <CardDescription>Describe the situation. AI will choose teams and responder counts automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Example: There is heavy smoke and one person is unconscious"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <Button onClick={reviewTrigger} disabled={pending || previewPending} className="w-full">
            {previewPending ? "Analysing with SafeWave AI..." : pending ? "Sending SOS..." : "Review SOS"}
          </Button>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Confirm Emergency Dispatch</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              SafeWave AI will auto-select the right responder teams and counts.
            </p>
            <div className="mt-3 rounded-md border border-border/70 bg-muted/40 p-3 text-sm text-foreground/90">
              {description.trim() || "No details provided."}
            </div>
            <div className="mt-3 rounded-md border border-border/70 bg-muted/40 p-3 text-sm text-foreground/90">
              {dispatchPreview ? (
                <>
                  <p className="font-medium">
                    AI plan: {dispatchPreview.primaryType} ({Math.round(dispatchPreview.confidence * 100)}% confidence)
                  </p>
                  <p className="mt-1 text-muted-foreground">{dispatchPreview.summary}</p>
                  <div className="mt-2 grid gap-1">
                    {dispatchPreview.teams.map((team) => (
                      <p key={team.role}>
                        {team.role} x{team.count} | {team.rationale}
                      </p>
                    ))}
                  </div>
                </>
              ) : (
                "SafeWave AI dispatch preview unavailable"
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={submitTrigger} disabled={pending || !dispatchPreview}>
                {pending ? "Sending..." : "Send SOS"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

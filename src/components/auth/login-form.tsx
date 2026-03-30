"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { login, type AuthActionState } from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const INITIAL_STATE: AuthActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, INITIAL_STATE);

  return (
    <Card className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/90 backdrop-blur">
      <CardHeader className="gap-3">
        <Badge variant="outline" className="w-fit rounded-full border-border/70 bg-background/80 px-3">
          Welcome back
        </Badge>
        <CardTitle className="text-2xl">Sign in to SafeWave</CardTitle>
        <CardDescription className="text-pretty">Sign in to request help, track updates, or continue team response work.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(state.message)}>
              <FieldContent>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(state.message)} />
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(state.message)}>
              <FieldContent>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(state.message)}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
          {state.message ? (
            <Alert variant="destructive">
              <AlertTitle>Sign in failed</AlertTitle>
              <AlertDescription>
                <FieldError>{state.message}</FieldError>
              </AlertDescription>
            </Alert>
          ) : null}
          <SubmitButton />
        </form>

        <div className="rounded-xl border border-border/70 bg-background/75 p-3 text-xs text-muted-foreground">
          After sign in, we take you to the right dashboard automatically.
        </div>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/70 bg-muted/30">
        <p className="text-sm text-muted-foreground/90">
          New to SafeWave?{" "}
          <Link href="/signup" className="text-primary underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

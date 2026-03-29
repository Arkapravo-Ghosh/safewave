"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signup, type AuthActionState } from "@/app/(auth)/actions";
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
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, INITIAL_STATE);

  return (
    <Card className="mx-auto w-full max-w-md rounded-3xl border border-border/70 bg-card/90 py-6 shadow-lg shadow-primary/10 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Every new account starts with the default user role.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <FieldGroup>
            <Field data-invalid={Boolean(state.message)}>
              <FieldContent>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" name="name" autoComplete="name" required minLength={2} aria-invalid={Boolean(state.message)} />
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(state.message)}>
              <FieldContent>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(state.message)} />
              </FieldContent>
            </Field>
            <Field data-invalid={Boolean(state.message)}>
              <FieldContent>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={Boolean(state.message)} />
              </FieldContent>
            </Field>
          </FieldGroup>
          {state.message ? (
            <Alert variant="destructive">
              <AlertTitle>Sign up failed</AlertTitle>
              <AlertDescription>
                <FieldError>{state.message}</FieldError>
              </AlertDescription>
            </Alert>
          ) : null}
          <SubmitButton />
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground/90">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

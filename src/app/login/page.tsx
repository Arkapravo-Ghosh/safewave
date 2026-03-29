import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getHomeRouteForRole } from "@/lib/auth/routes";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect(getHomeRouteForRole(session.role));
  }

  return (
    <AuthShell
      badge="Sign in"
      title="Welcome back to SafeWave"
      description="Access your workspace to manage account roles, monitor session security, and continue where you left off."
    >
      <LoginForm />
    </AuthShell>
  );
}

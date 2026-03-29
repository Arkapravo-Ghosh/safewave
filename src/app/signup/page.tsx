import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getHomeRouteForRole } from "@/lib/auth/routes";
import { getSession } from "@/lib/auth/session";

export default async function SignupPage() {
  const session = await getSession();

  if (session) {
    redirect(getHomeRouteForRole(session.role));
  }

  return (
    <AuthShell
      badge="Create account"
      title="Set up your SafeWave identity"
      description="Create your account and start with the default user role. Admin and superadmin permissions can be assigned by privileged accounts later."
    >
      <SignupForm />
    </AuthShell>
  );
}

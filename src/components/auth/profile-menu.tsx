"use client";

import { useCallback, useMemo, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { RoleBadge } from "@/components/auth/role-badge";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UserRole } from "@/lib/auth/constants";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

interface ProfileResponse {
  profile: ProfileData;
}

const PROFILE_THEME_OPTIONS: Array<{ label: string; value: "light" | "dark" | "system" }> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const { theme, setTheme } = useTheme();

  const loadProfile = useCallback(async () => {
    setLoading(true);

    const response = await fetch("/api/profile", { cache: "no-store" });

    if (!response.ok) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as ProfileResponse;
    setProfile(payload.profile);
    setName(payload.profile.name);
    setLoading(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) {
        void loadProfile();
      }
    },
    [loadProfile]
  );

  const currentThemeLabel = useMemo(() => {
    if (theme === "dark") {
      return "Dark";
    }

    if (theme === "light") {
      return "Light";
    }

    return "System";
  }, [theme]);

  const saveProfile = async () => {
    setProfileMessage("");
    setSavingProfile(true);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const payload = (await response.json()) as { error?: string; profile?: ProfileData };

    if (!response.ok) {
      setProfileMessage(payload.error ?? "Failed to update profile");
      setSavingProfile(false);
      return;
    }

    if (payload.profile) {
      setProfile(payload.profile);
      setName(payload.profile.name);
    }

    setProfileMessage("Profile updated.");
    setSavingProfile(false);
  };

  const savePassword = async () => {
    setPasswordMessage("");

    if (nextPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }

    setSavingPassword(true);

    const response = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        nextPassword,
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setPasswordMessage(payload.error ?? "Failed to update password");
      setSavingPassword(false);
      return;
    }

    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated.");
    setSavingPassword(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => handleOpenChange(true)}
      >
        Profile
      </Button>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Self Account Profile</SheetTitle>
            <SheetDescription>
              Customize your personal account settings, security credentials, and theme preference.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 p-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Summary</CardTitle>
                <CardDescription>Signed in identity and role context.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading || !profile ? (
                  <p className="text-sm text-muted-foreground">Loading profile...</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm">
                      {profile.name} ({profile.email})
                    </p>
                    <RoleBadge role={profile.role} />
                    <p className="text-xs text-muted-foreground">
                      Member since {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Update your display name used across dashboards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FieldGroup>
                  <Field>
                    <FieldContent>
                      <FieldLabel htmlFor="profile-name">Display name</FieldLabel>
                      <Input
                        id="profile-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        minLength={2}
                        maxLength={80}
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving profile..." : "Save profile"}
                </Button>
                {profileMessage ? <p className="text-sm text-muted-foreground">{profileMessage}</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Rotate your account password safely.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FieldGroup>
                  <Field>
                    <FieldContent>
                      <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldContent>
                      <FieldLabel htmlFor="next-password">New password</FieldLabel>
                      <Input
                        id="next-password"
                        type="password"
                        minLength={8}
                        value={nextPassword}
                        onChange={(event) => setNextPassword(event.target.value)}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldContent>
                      <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
                      <Input
                        id="confirm-password"
                        type="password"
                        minLength={8}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
                <Button onClick={savePassword} disabled={savingPassword}>
                  {savingPassword ? "Updating password..." : "Update password"}
                </Button>
                {passwordMessage ? <p className="text-sm text-muted-foreground">{passwordMessage}</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Current preference: {currentThemeLabel}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {PROFILE_THEME_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? "default" : "outline"}
                    onClick={() => setTheme(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session</CardTitle>
                <CardDescription>Sign out from this browser session.</CardDescription>
              </CardHeader>
              <CardContent>
                <LogoutButton />
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

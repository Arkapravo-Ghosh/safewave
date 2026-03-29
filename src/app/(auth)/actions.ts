"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db, schema } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getHomeRouteForRole } from "@/lib/auth/routes";
import { clearSession, setSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/users";

export type AuthActionState = {
  message?: string;
};

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long."),
  email: z.string().trim().email("Please enter a valid email.").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email.").toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export async function signup(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const validatedFields = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { name, email, password } = validatedFields.data;

  try {
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return { message: "An account already exists with this email." };
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(schema.users)
      .values({
        name,
        email,
        passwordHash,
        role: "user",
      })
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
      });

    await setSession(newUser);
  } catch (error) {
    console.error("Signup failed", error);
    return { message: "Unable to create your account right now. Please try again." };
  }

  redirect(getHomeRouteForRole("user"));
}

export async function login(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      message: validatedFields.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await findUserByEmail(email);

    if (!user?.passwordHash) {
      return { message: "Invalid email or password." };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return { message: "Invalid email or password." };
    }

    await setSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    redirect(getHomeRouteForRole(user.role));
  } catch (error) {
    console.error("Login failed", error);
    return { message: "Unable to log in right now. Please try again." };
  }
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}

"use server";

import { headers } from "next/headers";
import { hash } from "bcryptjs";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export type ActionResult = { error?: string };

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

const GENERIC_SIGNUP_ERROR = "Couldn't create your account with those details. If you already have one, try logging in instead.";
const RATE_LIMIT_ERROR = "Too many attempts. Please wait a minute and try again.";

export async function signupLearner(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  if (!checkRateLimit(`signup:${ip}`, 5, 60 * 60_000)) {
    return { error: RATE_LIMIT_ERROR };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    return { error: "Please fill all fields — password needs at least 8 characters." };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    // Deliberately generic — don't confirm whether this email is registered.
    return { error: GENERIC_SIGNUP_ERROR };
  }

  await db.insert(users).values({
    name,
    email,
    passwordHash: await hash(password, 10),
    role: "learner",
  });

  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  if (!checkRateLimit(`login:${ip}`, 10, 60_000) || !checkRateLimit(`login:${ip}:${email}`, 5, 60_000)) {
    return { error: RATE_LIMIT_ERROR };
  }

  try {
    await signIn("credentials", { email, password, redirectTo });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err;
  }
}

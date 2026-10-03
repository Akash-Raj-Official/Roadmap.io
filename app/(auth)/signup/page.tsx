"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupLearner, type ActionResult } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupLearner, initialState);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold">Start your trail</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your progress across every track.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

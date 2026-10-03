"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: ActionResult = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage subjects, milestones, and resources.</p>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value="/admin" />
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in as admin"}
          </Button>
        </form>
      </div>
    </div>
  );
}

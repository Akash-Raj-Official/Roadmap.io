import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { listSubjects } from "@/lib/data";
import { createSubject, deleteSubject } from "@/app/actions/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight } from "lucide-react";

// Admin-only, always-fresh data — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const subjects = await listSubjects();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h1 className="font-heading text-3xl font-semibold">Admin — Subjects</h1>
          <p className="mt-1 text-muted-foreground">Create tracks and manage their milestones.</p>

          <form action={createSubject} className="mt-8 grid gap-3 rounded-3xl border border-border bg-card p-6 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="title">Subject title</Label>
              <Input id="title" name="title" placeholder="e.g. DevOps" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Accent color</Label>
              <Input id="color" name="color" type="color" defaultValue="#e8823a" className="h-10 w-16 p-1" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Short description of this track" />
            </div>
            <Button type="submit" className="sm:col-span-2 bg-accent text-accent-foreground hover:bg-accent/90">
              Create subject
            </Button>
          </form>

          <div className="mt-8 space-y-3">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div>
                  <p className="font-heading font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/subjects/${s.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-accent"
                  >
                    Manage <ArrowRight className="size-3.5" />
                  </Link>
                  <form action={deleteSubject.bind(null, s.id)}>
                    <Button variant="ghost" size="icon" type="submit">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </form>
                </div>
              </div>
            ))}
            {subjects.length === 0 && <p className="text-muted-foreground">No subjects yet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

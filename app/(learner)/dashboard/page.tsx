import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { auth } from "@/lib/auth";
import { listSubjects, getReadinessBySubject } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";
import { CAREER_LEVELS } from "@/lib/readiness";

const TIER_LABEL: Record<string, string> = {
  fresher: "Fresher",
  intermediate: "Intermediate",
  expert: "Expert",
};

// Per-learner progress data — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [subjects, readinessBySubject] = await Promise.all([
    listSubjects(),
    getReadinessBySubject(userId),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <h1 className="font-heading text-3xl font-semibold">
            Welcome back, {session!.user.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s where your trails stand.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {subjects.map((s) => {
              const stats = readinessBySubject.get(s.id) ?? {
                total: 0,
                done: 0,
                readiness: { fresher: 0, intermediate: 0, expert: 0 },
              };
              const overallPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

              return (
                <Link
                  key={s.id}
                  href={`/tracks/${s.slug}`}
                  className="group rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-lg font-semibold">{s.title}</h3>
                    <span className="text-sm text-muted-foreground">
                      {stats.done}/{stats.total}
                    </span>
                  </div>
                  <Progress value={overallPct} className="mt-3" />

                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Job-readiness by level
                    </p>
                    {CAREER_LEVELS.map((tier) => (
                      <div key={tier} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">
                          {TIER_LABEL[tier]}
                        </span>
                        <Progress value={stats.readiness[tier]} className="h-1.5 flex-1" />
                        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {stats.readiness[tier]}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                    Continue trail <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
            {subjects.length === 0 && (
              <p className="text-muted-foreground">No tracks available yet.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

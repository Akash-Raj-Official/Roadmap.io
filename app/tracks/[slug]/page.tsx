import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { RoadmapTree } from "@/components/roadmap/roadmap-tree";
import { getSubjectBySlug, getUserProgressForSubject } from "@/lib/data";
import { auth } from "@/lib/auth";
import { toggleTopicProgress } from "@/app/actions/progress";
import { Progress } from "@/components/ui/progress";

// Renders differently per viewer (public vs. learner progress) — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const subject = await getSubjectBySlug(slug);
  if (!subject) notFound();

  const session = await auth();
  const isLearner = session?.user?.role === "learner";

  const completedIds = isLearner
    ? Array.from(
        await getUserProgressForSubject(
          session!.user.id,
          subject.topics.map((t) => t.id),
        ),
      )
    : [];

  const total = subject.topics.length;
  const pct = total > 0 ? Math.round((completedIds.length / total) * 100) : 0;

  async function onToggle(topicId: string, completed: boolean) {
    "use server";
    await toggleTopicProgress(topicId, completed, slug);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 pt-14 text-center">
          <p className="text-sm font-medium text-accent">Track</p>
          <h1 className="mt-1 font-heading text-4xl font-semibold">{subject.title}</h1>
          <p className="mt-3 text-muted-foreground">{subject.description}</p>

          {isLearner ? (
            <div className="mx-auto mt-6 max-w-sm">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} className="mt-1.5" />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link href="/signup" className="font-medium text-accent underline underline-offset-4">
                Create an account
              </Link>{" "}
              to track your progress on this trail.
            </p>
          )}
        </div>
        <RoadmapTree
          topics={subject.topics}
          completedIds={completedIds}
          interactive={isLearner}
          onToggle={isLearner ? onToggle : undefined}
        />
      </main>
    </div>
  );
}

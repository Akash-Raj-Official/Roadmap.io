import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { db } from "@/lib/db/client";
import { subjects, topics } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { createTopic, deleteTopic, addResource } from "@/app/actions/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Admin-only, always-fresh data — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function ManageSubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, id) });
  if (!subject) notFound();

  const subjectTopics = await db.query.topics.findMany({
    where: eq(topics.subjectId, id),
    orderBy: asc(topics.order),
    with: { resources: true },
  });

  const milestones = subjectTopics.filter((t) => !t.parentTopicId);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <p className="text-sm font-medium text-accent">Subject</p>
          <h1 className="font-heading text-3xl font-semibold">{subject.title}</h1>

          <form action={createTopic} className="mt-8 grid gap-3 rounded-3xl border border-border bg-card p-6">
            <input type="hidden" name="subjectId" value={subject.id} />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="e.g. Docker" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level">Level</Label>
                <Select name="level" defaultValue="milestone">
                  <SelectTrigger id="level" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="topic">Topic</SelectItem>
                    <SelectItem value="subtopic">Subtopic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="careerLevel">Required for</Label>
                <Select name="careerLevel" defaultValue="fresher">
                  <SelectTrigger id="careerLevel" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresher">Fresher</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="What this covers" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parentTopicId">Parent milestone (optional, for sub-topics)</Label>
              <Select name="parentTopicId">
                <SelectTrigger id="parentTopicId" className="w-full">
                  <SelectValue placeholder="None — top-level milestone" />
                </SelectTrigger>
                <SelectContent>
                  {milestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Add topic
            </Button>
          </form>

          <div className="mt-8 space-y-4">
            {milestones.map((m) => (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-semibold">{m.title}</p>
                    <Badge variant="outline" className="font-normal capitalize">
                      {m.careerLevel}
                    </Badge>
                  </div>
                  <form action={deleteTopic.bind(null, m.id, subject.id)}>
                    <Button variant="ghost" size="icon" type="submit">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </form>
                </div>
                {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}

                <div className="mt-3 space-y-2 border-l-2 border-border pl-4">
                  {subjectTopics
                    .filter((t) => t.parentTopicId === m.id)
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span>{t.title}</span>
                        <form action={deleteTopic.bind(null, t.id, subject.id)}>
                          <Button variant="ghost" size="icon" className="size-6" type="submit">
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </form>
                      </div>
                    ))}
                </div>

                <form action={addResource} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="topicId" value={m.id} />
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <Input name="title" placeholder="Resource title" className="h-8 text-sm" required />
                  <Input name="url" placeholder="https://…" className="h-8 text-sm" required />
                  <Button type="submit" size="sm" variant="secondary">
                    Add link
                  </Button>
                </form>
                {m.resources.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {m.resources.map((r) => (
                      <li key={r.id} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {r.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {milestones.length === 0 && <p className="text-muted-foreground">No topics yet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

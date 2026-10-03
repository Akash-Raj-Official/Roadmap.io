import { db } from "@/lib/db/client";
import { subjects, topics, resources, progress } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { computeReadiness, type ReadinessBreakdown } from "@/lib/readiness";

export async function listSubjects() {
  return db.query.subjects.findMany({ orderBy: asc(subjects.order) });
}

export async function getSubjectBySlug(slug: string) {
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.slug, slug),
  });
  if (!subject) return null;

  const subjectTopics = await db.query.topics.findMany({
    where: eq(topics.subjectId, subject.id),
    orderBy: asc(topics.order),
    with: { resources: { orderBy: asc(resources.order) } },
  });

  return { ...subject, topics: subjectTopics };
}

export async function getUserProgressForSubject(userId: string, topicIds: string[]) {
  if (topicIds.length === 0) return new Set<string>();
  const rows = await db.query.progress.findMany({
    where: (p, { and, eq, inArray }) => and(eq(p.userId, userId), inArray(p.topicId, topicIds)),
  });
  return new Set(rows.map((r) => r.topicId));
}

export async function getAllProgressForUser(userId: string) {
  return db.query.progress.findMany({ where: eq(progress.userId, userId) });
}

export async function getReadinessBySubject(
  userId: string,
): Promise<Map<string, { total: number; done: number; readiness: ReadinessBreakdown }>> {
  const [allSubjects, allTopics, userProgress] = await Promise.all([
    db.query.subjects.findMany(),
    db.query.topics.findMany(),
    getAllProgressForUser(userId),
  ]);

  const completedTopicIds = new Set(userProgress.map((p) => p.topicId));

  const result = new Map<string, { total: number; done: number; readiness: ReadinessBreakdown }>();
  for (const s of allSubjects) {
    const subjectTopics = allTopics.filter((t) => t.subjectId === s.id);
    const topicIds = subjectTopics.map((t) => t.id);
    const careerLevels = subjectTopics.map((t) => t.careerLevel);
    const done = topicIds.filter((id) => completedTopicIds.has(id)).length;

    result.set(s.id, {
      total: topicIds.length,
      done,
      readiness: computeReadiness(careerLevels, completedTopicIds, topicIds),
    });
  }
  return result;
}

import { describe, expect, it, afterEach, beforeAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "@/lib/db/client";
import { users, subjects, topics, resources, progress } from "@/lib/db/schema";
import { getReadinessBySubject, getSubjectBySlug, getUserProgressForSubject, listSubjects } from "@/lib/data";

const seedIds: string[] = [];
const seedSubjectIds: string[] = [];

async function cleanup() {
  for (const subjectId of [...seedSubjectIds].reverse()) {
    const subjectTopics = await db.query.topics.findMany({ where: eq(topics.subjectId, subjectId) });
    const topicIds = subjectTopics.map((topic) => topic.id);

    if (topicIds.length > 0) {
      await db.delete(resources).where(inArray(resources.topicId, topicIds));
    }

    await db.delete(topics).where(eq(topics.subjectId, subjectId));
    await db.delete(subjects).where(eq(subjects.id, subjectId));
  }
  seedSubjectIds.length = 0;

  for (const userId of [...seedIds].reverse()) {
    await db.delete(progress).where(eq(progress.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
  seedIds.length = 0;
}

beforeAll(async () => {
  await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: "./drizzle" });
});

afterEach(async () => {
  await cleanup();
});

describe("subject/topic data model", () => {
  it("lists subjects with their topic tree and resources", async () => {
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const [learner] = await db
      .insert(users)
      .values({
        name: "Test Learner",
        email: `learner-${unique}@example.com`,
        passwordHash: "hashed-password",
        role: "learner",
      })
      .returning();
    seedIds.push(learner.id);

    const [subject] = await db
      .insert(subjects)
      .values({
        slug: `subject-${unique}`,
        title: "Test Subject",
        description: "A subject used for schema validation.",
        color: "#8b5cf6",
        order: 0,
        createdBy: learner.id,
      })
      .returning();
    seedSubjectIds.push(subject.id);

    const [milestone] = await db
      .insert(topics)
      .values({
        subjectId: subject.id,
        title: "Milestone One",
        description: "Top-level milestone",
        level: "milestone",
        careerLevel: "fresher",
        order: 0,
      })
      .returning();

    const [topic] = await db
      .insert(topics)
      .values({
        subjectId: subject.id,
        parentTopicId: milestone.id,
        title: "Nested Topic",
        description: "A child topic",
        level: "topic",
        careerLevel: "intermediate",
        order: 0,
      })
      .returning();

    await db.insert(resources).values({
      topicId: topic.id,
      title: "Practice resource",
      url: "https://example.com/practice",
      type: "article",
      order: 0,
    });

    const listed = await listSubjects();
    expect(listed.some((item) => item.id === subject.id)).toBe(true);

    const subjectBySlug = await getSubjectBySlug(subject.slug);
    expect(subjectBySlug).not.toBeNull();
    expect(subjectBySlug?.title).toBe("Test Subject");
    expect(subjectBySlug?.topics.some((item) => item.id === milestone.id)).toBe(true);
    expect(subjectBySlug?.topics.find((item) => item.id === topic.id)?.resources[0]?.title).toBe("Practice resource");
  });

  it("tracks learner progress and readiness within a subject", async () => {
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const [learner] = await db
      .insert(users)
      .values({
        name: "Progress Learner",
        email: `progress-${unique}@example.com`,
        passwordHash: "hashed-password",
        role: "learner",
      })
      .returning();
    seedIds.push(learner.id);

    const [subject] = await db
      .insert(subjects)
      .values({
        slug: `progress-subject-${unique}`,
        title: "Progress Subject",
        description: "A subject for readiness checks.",
        color: "#22c55e",
        order: 1,
        createdBy: learner.id,
      })
      .returning();
    seedSubjectIds.push(subject.id);

    const [fresherTopic] = await db
      .insert(topics)
      .values({
        subjectId: subject.id,
        title: "Basic Linux",
        description: "Foundational topic",
        level: "milestone",
        careerLevel: "fresher",
        order: 0,
      })
      .returning();

    const [expertTopic] = await db
      .insert(topics)
      .values({
        subjectId: subject.id,
        title: "Advanced Kubernetes",
        description: "Expert-only topic",
        level: "milestone",
        careerLevel: "expert",
        order: 1,
      })
      .returning();

    await db.insert(progress).values({ userId: learner.id, topicId: fresherTopic.id });

    const completedSet = await getUserProgressForSubject(learner.id, [fresherTopic.id, expertTopic.id]);
    expect(completedSet.has(fresherTopic.id)).toBe(true);
    expect(completedSet.has(expertTopic.id)).toBe(false);

    const readiness = await getReadinessBySubject(learner.id);
    const subjectReadiness = readiness.get(subject.id);
    expect(subjectReadiness).toBeDefined();
    expect(subjectReadiness?.done).toBe(1);
    expect(subjectReadiness?.readiness.fresher).toBeGreaterThan(0);
    expect(subjectReadiness?.readiness.expert).toBe(50);
  });
});

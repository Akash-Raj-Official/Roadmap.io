"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { progress, subjects, topics } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function toggleTopicProgress(topicId: string, completed: boolean, trackSlug: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (session.user.role !== "learner") throw new Error("Forbidden");

  const userId = session.user.id;

  const subject = await db.query.subjects.findFirst({ where: eq(subjects.slug, trackSlug) });
  if (!subject) throw new Error("Track not found");

  const topic = await db.query.topics.findFirst({
    where: eq(topics.id, topicId),
  });

  if (!topic || topic.subjectId !== subject.id) {
    throw new Error("Topic not found for this track");
  }

  if (completed) {
    await db
      .insert(progress)
      .values({ userId, topicId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(progress)
      .where(and(eq(progress.userId, userId), eq(progress.topicId, topicId)));
  }

  revalidatePath(`/tracks/${trackSlug}`);
  revalidatePath("/dashboard");
}

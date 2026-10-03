"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { subjects, topics, resources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "@/lib/slug";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Forbidden");
  return session.user;
}

export async function createSubject(formData: FormData) {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#e8823a");
  if (!title) throw new Error("Title is required");

  const [subject] = await db
    .insert(subjects)
    .values({ title, slug: slugify(title), description, color, createdBy: admin.id })
    .returning();

  revalidatePath("/admin");
  redirect(`/admin/subjects/${subject.id}`);
}

export async function deleteSubject(subjectId: string) {
  await requireAdmin();
  await db.delete(subjects).where(eq(subjects.id, subjectId));
  revalidatePath("/admin");
}

export async function createTopic(formData: FormData) {
  await requireAdmin();
  const subjectId = String(formData.get("subjectId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const level = String(formData.get("level") ?? "milestone") as "milestone" | "topic" | "subtopic";
  const careerLevel = String(formData.get("careerLevel") ?? "fresher") as
    | "fresher"
    | "intermediate"
    | "expert";
  const parentTopicId = formData.get("parentTopicId") ? String(formData.get("parentTopicId")) : null;
  if (!title) throw new Error("Title is required");

  const existing = await db.query.topics.findMany({ where: eq(topics.subjectId, subjectId) });

  await db.insert(topics).values({
    subjectId,
    title,
    description,
    level,
    careerLevel,
    parentTopicId,
    order: existing.length,
  });

  revalidatePath(`/admin/subjects/${subjectId}`);
}

export async function deleteTopic(topicId: string, subjectId: string) {
  await requireAdmin();
  await db.delete(topics).where(eq(topics.id, topicId));
  revalidatePath(`/admin/subjects/${subjectId}`);
}

export async function addResource(formData: FormData) {
  await requireAdmin();
  const topicId = String(formData.get("topicId"));
  const subjectId = String(formData.get("subjectId"));
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const type = String(formData.get("type") ?? "article") as "article" | "video" | "doc";
  if (!title || !url) throw new Error("Title and URL are required");

  await db.insert(resources).values({ topicId, title, url, type });
  revalidatePath(`/admin/subjects/${subjectId}`);
}

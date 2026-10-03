import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "learner"] })
    .notNull()
    .default("learner"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1"),
  order: integer("order").notNull().default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const topics = sqliteTable("topics", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  parentTopicId: text("parent_topic_id"),
  title: text("title").notNull(),
  description: text("description"),
  level: text("level", { enum: ["milestone", "topic", "subtopic"] })
    .notNull()
    .default("topic"),
  careerLevel: text("career_level", { enum: ["fresher", "intermediate", "expert"] })
    .notNull()
    .default("fresher"),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const resources = sqliteTable("resources", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  topicId: text("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  type: text("type", { enum: ["article", "video", "doc"] })
    .notNull()
    .default("article"),
  order: integer("order").notNull().default(0),
});

export const progress = sqliteTable(
  "progress",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    completedAt: integer("completed_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("progress_user_topic_idx").on(table.userId, table.topicId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  subjects: many(subjects),
  progress: many(progress),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  creator: one(users, { fields: [subjects.createdBy], references: [users.id] }),
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  subject: one(subjects, { fields: [topics.subjectId], references: [subjects.id] }),
  parent: one(topics, {
    fields: [topics.parentTopicId],
    references: [topics.id],
    relationName: "parentChild",
  }),
  children: many(topics, { relationName: "parentChild" }),
  resources: many(resources),
  progress: many(progress),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  topic: one(topics, { fields: [resources.topicId], references: [topics.id] }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, { fields: [progress.userId], references: [users.id] }),
  topic: one(topics, { fields: [progress.topicId], references: [topics.id] }),
}));

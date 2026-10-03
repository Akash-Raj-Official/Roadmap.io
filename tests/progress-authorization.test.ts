import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockAuth = vi.fn();
  const mockRevalidatePath = vi.fn();
  const mockDb = {
    query: {
      subjects: { findFirst: vi.fn() },
      topics: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    delete: vi.fn(),
  };

  return { mockAuth, mockRevalidatePath, mockDb };
});

vi.mock("next/cache", () => ({
  revalidatePath: hoisted.mockRevalidatePath,
}));
vi.mock("@/lib/auth", () => ({
  auth: hoisted.mockAuth,
}));
vi.mock("@/lib/db/client", () => ({
  db: hoisted.mockDb,
}));

import { toggleTopicProgress } from "@/app/actions/progress";

describe("toggleTopicProgress authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockRevalidatePath.mockResolvedValue(undefined);
    hoisted.mockDb.query.subjects.findFirst.mockResolvedValue({ id: "subject-devops", slug: "devops" });
    hoisted.mockDb.query.topics.findFirst.mockResolvedValue({ id: "topic-1", subjectId: "subject-devops" });
  });

  it("rejects non-learner users", async () => {
    hoisted.mockAuth.mockResolvedValue({ user: { id: "user-1", role: "admin" } });

    await expect(toggleTopicProgress("topic-1", true, "devops")).rejects.toThrow("Forbidden");
  });

  it("rejects topic IDs that do not belong to the requested track", async () => {
    hoisted.mockAuth.mockResolvedValue({ user: { id: "user-1", role: "learner" } });
    hoisted.mockDb.query.topics.findFirst.mockResolvedValue(null);

    await expect(toggleTopicProgress("topic-999", true, "devops")).rejects.toThrow("Topic not found for this track");
  });

  it("allows valid learner progress updates for the owning track", async () => {
    hoisted.mockAuth.mockResolvedValue({ user: { id: "user-1", role: "learner" } });
    const insertBuilder = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
    const deleteBuilder = {
      where: vi.fn().mockResolvedValue(undefined),
    };
    hoisted.mockDb.insert.mockReturnValue(insertBuilder);
    hoisted.mockDb.delete.mockReturnValue(deleteBuilder);

    await expect(toggleTopicProgress("topic-1", true, "devops")).resolves.toBeUndefined();
    expect(hoisted.mockDb.insert).toHaveBeenCalledTimes(1);
    expect(hoisted.mockRevalidatePath).toHaveBeenCalledWith("/tracks/devops");
    expect(hoisted.mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

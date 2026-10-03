import { describe, expect, it } from "vitest";
import { computeReadiness } from "@/lib/readiness";

describe("computeReadiness", () => {
  const topicIds = ["linux", "docker", "kubernetes"];
  const levels = ["fresher", "intermediate", "expert"] as const;

  it("returns 0% for every tier with no progress", () => {
    const result = computeReadiness([...levels], new Set(), topicIds);
    expect(result).toEqual({ fresher: 0, intermediate: 0, expert: 0 });
  });

  it("fresher topic completion counts toward every tier", () => {
    const result = computeReadiness([...levels], new Set(["linux"]), topicIds);
    expect(result.fresher).toBe(100);
    expect(result.intermediate).toBe(50);
    expect(result.expert).toBe(33);
  });

  it("expert-only topic completion does not affect fresher/intermediate", () => {
    const result = computeReadiness([...levels], new Set(["kubernetes"]), topicIds);
    expect(result.fresher).toBe(0);
    expect(result.intermediate).toBe(0);
    expect(result.expert).toBe(33);
  });

  it("100% expert requires every topic complete", () => {
    const result = computeReadiness([...levels], new Set(topicIds), topicIds);
    expect(result).toEqual({ fresher: 100, intermediate: 100, expert: 100 });
  });

  it("handles a subject with no topics without dividing by zero", () => {
    const result = computeReadiness([], new Set(), []);
    expect(result).toEqual({ fresher: 0, intermediate: 0, expert: 0 });
  });
});

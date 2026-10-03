import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Cloud Engineering")).toBe("cloud-engineering");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("DevOps & SRE!!")).toBe("devops-sre");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  -Docker-  ")).toBe("docker");
  });
});

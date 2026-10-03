export type CareerLevel = "fresher" | "intermediate" | "expert";

const TIER_RANK: Record<CareerLevel, number> = {
  fresher: 1,
  intermediate: 2,
  expert: 3,
};

export const CAREER_LEVELS: CareerLevel[] = ["fresher", "intermediate", "expert"];

export type ReadinessBreakdown = Record<CareerLevel, number>;

/**
 * For each tier, the "required" topics are every topic whose careerLevel rank
 * is <= that tier's rank (fresher topics are foundational and required at every
 * tier; expert topics are only required at the expert tier).
 */
export function computeReadiness(
  topicCareerLevels: CareerLevel[],
  completedTopicIds: Set<string>,
  topicIds: string[],
): ReadinessBreakdown {
  const result = {} as ReadinessBreakdown;

  for (const tier of CAREER_LEVELS) {
    const requiredIndexes = topicCareerLevels
      .map((level, i) => ({ level, i }))
      .filter(({ level }) => TIER_RANK[level] <= TIER_RANK[tier]);

    if (requiredIndexes.length === 0) {
      result[tier] = 0;
      continue;
    }

    const completedCount = requiredIndexes.filter(({ i }) => completedTopicIds.has(topicIds[i])).length;
    result[tier] = Math.round((completedCount / requiredIndexes.length) * 100);
  }

  return result;
}

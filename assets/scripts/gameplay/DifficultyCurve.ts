export interface DifficultyPoint {
  readonly score: number;
  readonly scrollSpeed: number;
  readonly gapHeight: number;
  readonly maxCenterDelta: number;
}

export interface DifficultySnapshot {
  readonly score: number;
  readonly scrollSpeed: number;
  readonly gapHeight: number;
  readonly maxCenterDelta: number;
}

export const DIFFICULTY_POINTS: readonly DifficultyPoint[] = Object.freeze([
  Object.freeze({ score: 0, scrollSpeed: 205, gapHeight: 410, maxCenterDelta: 150 }),
  Object.freeze({ score: 5, scrollSpeed: 220, gapHeight: 390, maxCenterDelta: 170 }),
  Object.freeze({ score: 10, scrollSpeed: 240, gapHeight: 370, maxCenterDelta: 190 }),
  Object.freeze({ score: 20, scrollSpeed: 260, gapHeight: 350, maxCenterDelta: 210 }),
  Object.freeze({ score: 30, scrollSpeed: 280, gapHeight: 335, maxCenterDelta: 220 }),
]);

const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

export const sampleDifficulty = (
  score: number,
  points: readonly DifficultyPoint[] = DIFFICULTY_POINTS,
): DifficultySnapshot => {
  if (points.length === 0) {
    throw new Error('Difficulty curve requires at least one point.');
  }

  const safeScore = Math.max(0, score);
  const lastPoint = points[points.length - 1];
  if (safeScore >= lastPoint.score) {
    return { ...lastPoint, score: safeScore };
  }

  for (let index = 1; index < points.length; index += 1) {
    const upper = points[index];
    if (safeScore > upper.score) {
      continue;
    }

    const lower = points[index - 1];
    const scoreRange = upper.score - lower.score;
    const amount = scoreRange <= 0 ? 0 : (safeScore - lower.score) / scoreRange;
    return {
      score: safeScore,
      scrollSpeed: lerp(lower.scrollSpeed, upper.scrollSpeed, amount),
      gapHeight: lerp(lower.gapHeight, upper.gapHeight, amount),
      maxCenterDelta: lerp(lower.maxCenterDelta, upper.maxCenterDelta, amount),
    };
  }

  const firstPoint = points[0];
  return { ...firstPoint, score: safeScore };
};

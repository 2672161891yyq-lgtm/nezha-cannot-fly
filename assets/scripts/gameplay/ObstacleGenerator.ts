import { DifficultySnapshot, sampleDifficulty } from './DifficultyCurve';
import {
  BOTTOM_OBSTACLE_TYPES,
  BottomObstacleType,
  OBSTACLE_SYSTEM_CONFIG,
  ObstacleSystemConfig,
  TOP_OBSTACLE_TYPES,
  TopObstacleType,
} from './ObstacleSystemConfig';
import { RandomSource, SeededRandom } from './SeededRandom';

export interface ObstacleSpec {
  readonly runtimeId: number;
  readonly sequenceIndex: number;
  readonly topType: TopObstacleType;
  readonly bottomType: BottomObstacleType;
  readonly gapCenterY: number;
  readonly gapHeight: number;
  readonly obstacleWidth: number;
  readonly difficulty: DifficultySnapshot;
  readonly usedFallback: boolean;
}

export interface GapCenterRange {
  readonly minimum: number;
  readonly maximum: number;
}

interface ObstacleCombination {
  readonly topType: TopObstacleType;
  readonly bottomType: BottomObstacleType;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const combinationKey = (combination: ObstacleCombination): string =>
  `${combination.topType}|${combination.bottomType}`;

const isHighAttentionCombination = (combination: ObstacleCombination): boolean =>
  combination.bottomType === 'fireball' &&
  (combination.topType === 'lightning' || combination.topType === 'bagua-array');

export const getLegalGapCenterRange = (
  difficulty: DifficultySnapshot,
  config: ObstacleSystemConfig = OBSTACLE_SYSTEM_CONFIG,
): GapCenterRange => {
  const playableBottom = -config.designHeight / 2 + config.bottomSafeArea;
  const playableTop = config.designHeight / 2 - config.topSafeArea;
  const halfGap = difficulty.gapHeight / 2;
  const dynamicSafetyMargin =
    config.gapSafetyMargin + config.maximumDynamicVerticalTravel;

  return {
    minimum: Math.max(
      config.gapCenterMinimum,
      playableBottom + dynamicSafetyMargin + halfGap,
    ),
    maximum: Math.min(
      config.gapCenterMaximum,
      playableTop - dynamicSafetyMargin - halfGap,
    ),
  };
};

export class ObstacleGenerator {
  private readonly random: RandomSource;
  private previousGapCenter = 0;
  private hasPreviousGap = false;
  private lastCombinationKey = '';
  private combinationRepeatCount = 0;
  private lastTopType: TopObstacleType | null = null;
  private topTypeRepeatCount = 0;
  private lastBottomType: BottomObstacleType | null = null;
  private bottomTypeRepeatCount = 0;
  private previousWasHighAttention = false;
  private sequenceIndex = 0;
  private runtimeId = 1;

  public constructor(
    private readonly config: ObstacleSystemConfig = OBSTACLE_SYSTEM_CONFIG,
    random?: RandomSource,
  ) {
    this.random = random ?? new SeededRandom(config.seed);
    this.reset(config.seed);
  }

  public reset(seed = this.config.seed): void {
    this.random.reset?.(seed);
    this.previousGapCenter = 0;
    this.hasPreviousGap = false;
    this.lastCombinationKey = '';
    this.combinationRepeatCount = 0;
    this.lastTopType = null;
    this.topTypeRepeatCount = 0;
    this.lastBottomType = null;
    this.bottomTypeRepeatCount = 0;
    this.previousWasHighAttention = false;
    this.sequenceIndex = 0;
    this.runtimeId = 1;
  }

  public generate(score: number): ObstacleSpec {
    const difficulty = sampleDifficulty(score);
    const gapCenterY = this.generateGapCenter(difficulty);
    const { combination, usedFallback } = this.generateCombination();
    const widthAmount = this.random.next();
    const widthScale =
      this.config.minimumWidthScale +
      (this.config.maximumWidthScale - this.config.minimumWidthScale) * widthAmount;

    const spec: ObstacleSpec = {
      runtimeId: this.runtimeId,
      sequenceIndex: this.sequenceIndex,
      topType: combination.topType,
      bottomType: combination.bottomType,
      gapCenterY,
      gapHeight: difficulty.gapHeight,
      obstacleWidth: this.config.baseObstacleWidth * widthScale,
      difficulty,
      usedFallback,
    };

    this.runtimeId += 1;
    this.sequenceIndex += 1;
    this.previousGapCenter = gapCenterY;
    this.hasPreviousGap = true;
    this.rememberCombination(combination);
    return spec;
  }

  private generateGapCenter(difficulty: DifficultySnapshot): number {
    const legalRange = getLegalGapCenterRange(difficulty, this.config);
    if (legalRange.minimum > legalRange.maximum) {
      throw new Error('No legal obstacle gap is available for the current difficulty.');
    }

    // The first passage is a stable onboarding reference. Later passages keep
    // the original seeded high/low variation and adjacent-height limit.
    if (!this.hasPreviousGap) {
      return clamp(0, legalRange.minimum, legalRange.maximum);
    }

    const candidateMinimum = Math.max(
      legalRange.minimum,
      this.previousGapCenter - difficulty.maxCenterDelta,
    );
    const candidateMaximum = Math.min(
      legalRange.maximum,
      this.previousGapCenter + difficulty.maxCenterDelta,
    );

    if (candidateMinimum > candidateMaximum) {
      return clamp(this.previousGapCenter, legalRange.minimum, legalRange.maximum);
    }

    return candidateMinimum + (candidateMaximum - candidateMinimum) * this.random.next();
  }

  private generateCombination(): {
    readonly combination: ObstacleCombination;
    readonly usedFallback: boolean;
  } {
    for (let attempt = 0; attempt < this.config.randomRetryLimit; attempt += 1) {
      const combination: ObstacleCombination = {
        topType:
          TOP_OBSTACLE_TYPES[
            Math.min(
              TOP_OBSTACLE_TYPES.length - 1,
              Math.floor(this.random.next() * TOP_OBSTACLE_TYPES.length),
            )
          ],
        bottomType:
          BOTTOM_OBSTACLE_TYPES[
            Math.min(
              BOTTOM_OBSTACLE_TYPES.length - 1,
              Math.floor(this.random.next() * BOTTOM_OBSTACLE_TYPES.length),
            )
          ],
      };

      if (this.isCombinationAllowed(combination)) {
        return { combination, usedFallback: false };
      }
    }

    for (let topIndex = 0; topIndex < TOP_OBSTACLE_TYPES.length; topIndex += 1) {
      for (
        let bottomIndex = 0;
        bottomIndex < BOTTOM_OBSTACLE_TYPES.length;
        bottomIndex += 1
      ) {
        const combination: ObstacleCombination = {
          topType: TOP_OBSTACLE_TYPES[topIndex],
          bottomType: BOTTOM_OBSTACLE_TYPES[bottomIndex],
        };
        if (this.isCombinationAllowed(combination)) {
          return { combination, usedFallback: true };
        }
      }
    }

    return {
      combination: { topType: 'dark-cloud', bottomType: 'mountain' },
      usedFallback: true,
    };
  }

  private isCombinationAllowed(combination: ObstacleCombination): boolean {
    const key = combinationKey(combination);
    if (
      key === this.lastCombinationKey &&
      this.combinationRepeatCount >= this.config.combinationRepeatLimit
    ) {
      return false;
    }

    if (
      combination.topType === this.lastTopType &&
      this.topTypeRepeatCount >= this.config.typeRepeatLimit
    ) {
      return false;
    }

    if (
      combination.bottomType === this.lastBottomType &&
      this.bottomTypeRepeatCount >= this.config.typeRepeatLimit
    ) {
      return false;
    }

    return !(
      this.sequenceIndex < 3 &&
      this.previousWasHighAttention &&
      isHighAttentionCombination(combination)
    );
  }

  private rememberCombination(combination: ObstacleCombination): void {
    const key = combinationKey(combination);
    this.combinationRepeatCount =
      key === this.lastCombinationKey ? this.combinationRepeatCount + 1 : 1;
    this.lastCombinationKey = key;

    this.topTypeRepeatCount =
      combination.topType === this.lastTopType ? this.topTypeRepeatCount + 1 : 1;
    this.lastTopType = combination.topType;

    this.bottomTypeRepeatCount =
      combination.bottomType === this.lastBottomType
        ? this.bottomTypeRepeatCount + 1
        : 1;
    this.lastBottomType = combination.bottomType;
    this.previousWasHighAttention = isHighAttentionCombination(combination);
  }
}

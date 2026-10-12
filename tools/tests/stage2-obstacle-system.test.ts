import { sampleDifficulty } from '../../assets/scripts/gameplay/DifficultyCurve';
import { FixedObjectPool } from '../../assets/scripts/gameplay/FixedObjectPool';
import {
  getLegalGapCenterRange,
  ObstacleGenerator,
  ObstacleSpec,
} from '../../assets/scripts/gameplay/ObstacleGenerator';
import { ObstacleScoreGate } from '../../assets/scripts/gameplay/ObstacleScoreGate';
import { OBSTACLE_SYSTEM_CONFIG } from '../../assets/scripts/gameplay/ObstacleSystemConfig';
import { RandomSource } from '../../assets/scripts/gameplay/SeededRandom';

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const nearlyEqual = (actual: number, expected: number, tolerance = 0.0001): boolean =>
  Math.abs(actual - expected) <= tolerance;

const combinationKey = (spec: ObstacleSpec): string =>
  `${spec.topType}|${spec.bottomType}`;

const opening = sampleDifficulty(0);
const middle = sampleDifficulty(15);
const maximum = sampleDifficulty(30);
assert(opening.scrollSpeed === 205, 'Opening scroll speed must match the balance table.');
assert(opening.gapHeight === 410, 'Opening gap height must match the balance table.');
assert(middle.scrollSpeed === 250, 'Difficulty must interpolate between score anchors.');
assert(middle.gapHeight === 360, 'Gap height must interpolate between score anchors.');
assert(maximum.scrollSpeed === 280, 'Scroll speed must stop at the configured maximum.');
assert(maximum.gapHeight === 335, 'Gap height must stop at the configured minimum.');

const centeredOpening = new ObstacleGenerator().generate(0);
assert(
  nearlyEqual(centeredOpening.gapCenterY, 0),
  'The first moving passage must be vertically centered for onboarding.',
);
const openingGapTop = centeredOpening.gapCenterY + centeredOpening.gapHeight / 2;
const openingGapBottom = centeredOpening.gapCenterY - centeredOpening.gapHeight / 2;
assert(
  nearlyEqual((openingGapTop + openingGapBottom) / 2, centeredOpening.gapCenterY),
  'The visible passage edges must share the generated center line.',
);

const replayA = new ObstacleGenerator();
const replayB = new ObstacleGenerator();
for (let index = 0; index < 128; index += 1) {
  const score = Math.floor(index / 8);
  assert(
    JSON.stringify(replayA.generate(score)) === JSON.stringify(replayB.generate(score)),
    `Fixed seed diverged at generated obstacle ${index}.`,
  );
}

const generator = new ObstacleGenerator();
const combinations = new Set<string>();
const ids = new Set<number>();
let previous: ObstacleSpec | null = null;
let lastCombination = '';
let combinationStreak = 0;
let lastTopType = '';
let topStreak = 0;
let lastBottomType = '';
let bottomStreak = 0;
let fallbackCount = 0;

for (let index = 0; index < 10_000; index += 1) {
  const score = Math.floor(index / 25);
  const spec = generator.generate(score);
  const range = getLegalGapCenterRange(spec.difficulty);
  const key = combinationKey(spec);

  assert(
    spec.gapCenterY >= range.minimum - 0.0001 &&
      spec.gapCenterY <= range.maximum + 0.0001,
    `Obstacle ${index} generated outside the legal gap-center range.`,
  );
  assert(
    spec.gapHeight >= 335 && spec.gapHeight <= 410,
    `Obstacle ${index} generated an invalid gap height.`,
  );
  assert(
    spec.obstacleWidth >=
      OBSTACLE_SYSTEM_CONFIG.baseObstacleWidth *
        OBSTACLE_SYSTEM_CONFIG.minimumWidthScale -
        0.0001 &&
      spec.obstacleWidth <=
        OBSTACLE_SYSTEM_CONFIG.baseObstacleWidth *
          OBSTACLE_SYSTEM_CONFIG.maximumWidthScale +
          0.0001,
    `Obstacle ${index} generated an invalid width.`,
  );

  if (previous) {
    assert(
      Math.abs(spec.gapCenterY - previous.gapCenterY) <=
        spec.difficulty.maxCenterDelta + 0.0001,
      `Obstacle ${index} exceeded the adjacent center-delta limit.`,
    );
  }

  combinationStreak = key === lastCombination ? combinationStreak + 1 : 1;
  topStreak = spec.topType === lastTopType ? topStreak + 1 : 1;
  bottomStreak = spec.bottomType === lastBottomType ? bottomStreak + 1 : 1;
  assert(
    combinationStreak <= OBSTACLE_SYSTEM_CONFIG.combinationRepeatLimit,
    `Combination repeat limit failed at obstacle ${index}.`,
  );
  assert(
    topStreak <= OBSTACLE_SYSTEM_CONFIG.typeRepeatLimit,
    `Top obstacle repeat limit failed at obstacle ${index}.`,
  );
  assert(
    bottomStreak <= OBSTACLE_SYSTEM_CONFIG.typeRepeatLimit,
    `Bottom obstacle repeat limit failed at obstacle ${index}.`,
  );
  assert(!ids.has(spec.runtimeId), `Runtime ID ${spec.runtimeId} was reused.`);

  combinations.add(key);
  ids.add(spec.runtimeId);
  fallbackCount += spec.usedFallback ? 1 : 0;
  lastCombination = key;
  lastTopType = spec.topType;
  lastBottomType = spec.bottomType;
  previous = spec;
}

assert(combinations.size === 9, 'The generator must produce all nine obstacle combinations.');
assert(ids.size === 10_000, 'Every generated obstacle group must have a unique runtime ID.');

class ZeroRandom implements RandomSource {
  public next(): number {
    return 0;
  }
}

const fallbackGenerator = new ObstacleGenerator(OBSTACLE_SYSTEM_CONFIG, new ZeroRandom());
let forcedFallbacks = 0;
for (let index = 0; index < 12; index += 1) {
  forcedFallbacks += fallbackGenerator.generate(0).usedFallback ? 1 : 0;
}
assert(forcedFallbacks > 0, 'Repeated invalid random results must use the safe fallback.');

let factoryCalls = 0;
const pool = new FixedObjectPool(() => ({ id: factoryCalls++ }), 4);
const acquired = [pool.acquire(), pool.acquire(), pool.acquire(), pool.acquire()];
assert(pool.capacity === 4 && pool.activeCount === 4, 'Pool must preallocate four items.');
let exhausted = false;
try {
  pool.acquire();
} catch {
  exhausted = true;
}
assert(exhausted, 'An exhausted fixed pool must not allocate a fifth item.');
pool.release(acquired[1]);
const recycled = pool.acquire();
assert(recycled === acquired[1], 'Released obstacle objects must be reused.');
assert(factoryCalls === 4, 'Runtime recycling must not create additional obstacle objects.');
pool.reset();
assert(pool.activeCount === 0 && pool.availableCount === 4, 'Pool reset must release all items.');

const scoreGate = new ObstacleScoreGate();
scoreGate.reset(100);
assert(!scoreGate.tryPass(-155, -155), 'Touching the score line must not score early.');
assert(scoreGate.tryPass(-156, -155), 'Crossing the score line must score once.');
assert(!scoreGate.tryPass(-200, -155), 'One obstacle group must not score twice.');
scoreGate.reset(101);
assert(scoreGate.tryPass(-156, -155), 'Pool reuse must reset the score guard.');

assert(nearlyEqual(sampleDifficulty(5).gapHeight, 390), 'Difficulty anchor 5 is invalid.');

console.log(
  JSON.stringify({
    result: 'PASS',
    generated: ids.size,
    combinations: combinations.size,
    seededReplayCases: 128,
    randomFallbacks: fallbackCount,
    forcedFallbacks,
    poolFactoryCalls: factoryCalls,
  }),
);

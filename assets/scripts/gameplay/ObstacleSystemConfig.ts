export const TOP_OBSTACLE_TYPES = ['dark-cloud', 'lightning', 'bagua-array'] as const;
export const BOTTOM_OBSTACLE_TYPES = ['mountain', 'stone-pillar', 'fireball'] as const;

export type TopObstacleType = (typeof TOP_OBSTACLE_TYPES)[number];
export type BottomObstacleType = (typeof BOTTOM_OBSTACLE_TYPES)[number];

export const TOP_OBSTACLE_NAMES: Readonly<Record<TopObstacleType, string>> = Object.freeze({
  'dark-cloud': '乌云',
  lightning: '雷电',
  'bagua-array': '八卦阵',
});

export const BOTTOM_OBSTACLE_NAMES: Readonly<Record<BottomObstacleType, string>> =
  Object.freeze({
    mountain: '山峰',
    'stone-pillar': '石柱',
    fireball: '火球',
  });

export interface ObstacleSystemConfig {
  readonly designWidth: number;
  readonly designHeight: number;
  readonly topSafeArea: number;
  readonly bottomSafeArea: number;
  readonly gapCenterMinimum: number;
  readonly gapCenterMaximum: number;
  readonly gapSafetyMargin: number;
  readonly maximumDynamicVerticalTravel: number;
  readonly baseObstacleWidth: number;
  readonly minimumWidthScale: number;
  readonly maximumWidthScale: number;
  readonly collisionInsetRatio: number;
  readonly horizontalSpacing: number;
  readonly firstObstacleDistance: number;
  readonly poolSize: number;
  readonly offscreenRecyclePadding: number;
  readonly combinationRepeatLimit: number;
  readonly typeRepeatLimit: number;
  readonly randomRetryLimit: number;
  readonly fireballRadius: number;
  readonly fireballFloatAmplitude: number;
  readonly fireballFloatPeriod: number;
  readonly fireballRotationSpeed: number;
  readonly lightningWarningDuration: number;
  readonly lightningActiveDuration: number;
  readonly lightningCooldownDuration: number;
  readonly baguaRadius: number;
  readonly baguaOuterRotationSpeed: number;
  readonly baguaInnerRotationSpeed: number;
  readonly decorativeAnimationEnabled: boolean;
  readonly seed: number;
}

export const OBSTACLE_SYSTEM_CONFIG: ObstacleSystemConfig = Object.freeze({
  designWidth: 750,
  designHeight: 1334,
  topSafeArea: 110,
  bottomSafeArea: 130,
  gapCenterMinimum: -277,
  gapCenterMaximum: 263,
  gapSafetyMargin: 12,
  maximumDynamicVerticalTravel: 18,
  baseObstacleWidth: 132,
  minimumWidthScale: 0.92,
  maximumWidthScale: 1.08,
  collisionInsetRatio: 0.1,
  horizontalSpacing: 430,
  firstObstacleDistance: 830,
  poolSize: 4,
  offscreenRecyclePadding: 24,
  combinationRepeatLimit: 2,
  typeRepeatLimit: 3,
  randomRetryLimit: 5,
  fireballRadius: 46,
  fireballFloatAmplitude: 18,
  fireballFloatPeriod: 1.8,
  fireballRotationSpeed: 280,
  lightningWarningDuration: 0.8,
  lightningActiveDuration: 0.35,
  lightningCooldownDuration: 0.65,
  baguaRadius: 50,
  baguaOuterRotationSpeed: 45,
  baguaInnerRotationSpeed: -75,
  decorativeAnimationEnabled: true,
  seed: 0x4e5a3201,
});

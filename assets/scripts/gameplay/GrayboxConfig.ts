export interface GrayboxGameplayConfig {
  readonly designWidth: number;
  readonly designHeight: number;
  readonly playerX: number;
  readonly playerStartY: number;
  readonly playerVisualWidth: number;
  readonly playerVisualHeight: number;
  readonly playerCollisionRadius: number;
  readonly gravity: number;
  readonly flapVelocity: number;
  readonly maxRiseSpeed: number;
  readonly maxFallSpeed: number;
  readonly maxRiseAngle: number;
  readonly maxFallAngle: number;
  readonly rotationResponse: number;
  readonly topSafeArea: number;
  readonly bottomSafeArea: number;
  readonly obstacleWidth: number;
  readonly obstacleGap: number;
  readonly obstacleSpeed: number;
  readonly firstObstacleDistance: number;
  readonly recyclePadding: number;
  readonly gapCenters: readonly number[];
}

export const GRAYBOX_CONFIG: GrayboxGameplayConfig = Object.freeze({
  designWidth: 750,
  designHeight: 1334,
  playerX: -155,
  playerStartY: 0,
  playerVisualWidth: 118,
  playerVisualHeight: 96,
  playerCollisionRadius: 43,
  gravity: -1700,
  flapVelocity: 620,
  maxRiseSpeed: 680,
  maxFallSpeed: -850,
  maxRiseAngle: 20,
  maxFallAngle: -75,
  rotationResponse: 8,
  topSafeArea: 110,
  bottomSafeArea: 130,
  obstacleWidth: 132,
  obstacleGap: 400,
  obstacleSpeed: 210,
  firstObstacleDistance: 830,
  recyclePadding: 220,
  gapCenters: Object.freeze([40, 140, -80, 110, -120, 0]),
});


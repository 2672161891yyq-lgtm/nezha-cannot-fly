import {
  OBSTACLE_SYSTEM_CONFIG,
  ObstacleSystemConfig,
} from './ObstacleSystemConfig';

export type LightningPhase = 'warning' | 'active' | 'cooldown';

export interface DynamicObstacleSnapshot {
  readonly fireballOffsetY: number;
  readonly fireballRotationDegrees: number;
  readonly lightningPhase: LightningPhase;
  readonly lightningCollisionActive: boolean;
  readonly baguaOuterRotationDegrees: number;
  readonly baguaInnerRotationDegrees: number;
}

const FULL_ROTATION = 360;
const TAU = Math.PI * 2;

const wrapDegrees = (degrees: number): number =>
  ((degrees % FULL_ROTATION) + FULL_ROTATION) % FULL_ROTATION;

export class DynamicObstacleMotion {
  private elapsedTime = 0;
  private fireballPhaseRadians = 0;

  public constructor(
    private readonly config: ObstacleSystemConfig = OBSTACLE_SYSTEM_CONFIG,
  ) {}

  public reset(sequenceIndex: number): void {
    this.elapsedTime = 0;
    const normalizedPhase = (sequenceIndex * 0.61803398875) % 1;
    this.fireballPhaseRadians = normalizedPhase * TAU;
  }

  public step(deltaTime: number): void {
    this.elapsedTime += Math.max(0, deltaTime);
  }

  public get snapshot(): DynamicObstacleSnapshot {
    const fireballProgress = this.elapsedTime / this.config.fireballFloatPeriod;
    const fireballOffsetY =
      Math.sin(fireballProgress * TAU + this.fireballPhaseRadians) *
      this.config.fireballFloatAmplitude;
    const lightningPhase = this.getLightningPhase();
    const decorativeAnimationEnabled = this.config.decorativeAnimationEnabled;

    return {
      fireballOffsetY,
      fireballRotationDegrees: decorativeAnimationEnabled
        ? wrapDegrees(this.elapsedTime * this.config.fireballRotationSpeed)
        : 0,
      lightningPhase,
      lightningCollisionActive: lightningPhase === 'active',
      baguaOuterRotationDegrees: decorativeAnimationEnabled
        ? wrapDegrees(this.elapsedTime * this.config.baguaOuterRotationSpeed)
        : 0,
      baguaInnerRotationDegrees: decorativeAnimationEnabled
        ? wrapDegrees(this.elapsedTime * this.config.baguaInnerRotationSpeed)
        : 0,
    };
  }

  private getLightningPhase(): LightningPhase {
    const cycleDuration =
      this.config.lightningWarningDuration +
      this.config.lightningActiveDuration +
      this.config.lightningCooldownDuration;
    const cycleTime = this.elapsedTime % cycleDuration;

    if (cycleTime < this.config.lightningWarningDuration) {
      return 'warning';
    }
    if (
      cycleTime <
      this.config.lightningWarningDuration + this.config.lightningActiveDuration
    ) {
      return 'active';
    }
    return 'cooldown';
  }
}

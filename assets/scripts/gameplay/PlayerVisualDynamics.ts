export type PlayerFlightVisualState = 'idle' | 'rising' | 'cruising' | 'falling';

export interface WindFireWheelSnapshot {
  readonly flightState: PlayerFlightVisualState;
  readonly leftRotationDegrees: number;
  readonly rightRotationDegrees: number;
  readonly flameScale: number;
  readonly rotationSpeed: number;
}

const FULL_ROTATION = 360;

const wrapDegrees = (degrees: number): number =>
  ((degrees % FULL_ROTATION) + FULL_ROTATION) % FULL_ROTATION;

export const getPlayerFlightVisualState = (
  velocityY: number,
  isReady: boolean,
): PlayerFlightVisualState => {
  if (isReady) {
    return 'idle';
  }
  if (velocityY > 80) {
    return 'rising';
  }
  if (velocityY < -120) {
    return 'falling';
  }
  return 'cruising';
};

export class WindFireWheelMotion {
  private leftRotationDegrees = 0;
  private rightRotationDegrees = 0;
  private currentState: PlayerFlightVisualState = 'idle';

  public reset(): void {
    this.leftRotationDegrees = 0;
    this.rightRotationDegrees = 0;
    this.currentState = 'idle';
  }

  public step(deltaTime: number, state: PlayerFlightVisualState): void {
    const safeDeltaTime = Math.max(0, deltaTime);
    this.currentState = state;
    const rotationSpeed = this.getRotationSpeed(state);
    this.leftRotationDegrees = wrapDegrees(
      this.leftRotationDegrees + rotationSpeed * safeDeltaTime,
    );
    this.rightRotationDegrees = wrapDegrees(
      this.rightRotationDegrees - rotationSpeed * 1.07 * safeDeltaTime,
    );
  }

  public get snapshot(): WindFireWheelSnapshot {
    return {
      flightState: this.currentState,
      leftRotationDegrees: this.leftRotationDegrees,
      rightRotationDegrees: this.rightRotationDegrees,
      flameScale: this.getFlameScale(this.currentState),
      rotationSpeed: this.getRotationSpeed(this.currentState),
    };
  }

  private getRotationSpeed(state: PlayerFlightVisualState): number {
    if (state === 'rising') {
      return 720;
    }
    if (state === 'falling') {
      return 120;
    }
    if (state === 'cruising') {
      return 360;
    }
    return 180;
  }

  private getFlameScale(state: PlayerFlightVisualState): number {
    if (state === 'rising') {
      return 1.5;
    }
    if (state === 'falling') {
      return 0.62;
    }
    if (state === 'cruising') {
      return 1;
    }
    return 0.88;
  }
}

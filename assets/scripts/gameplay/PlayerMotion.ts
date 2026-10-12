import type { GrayboxGameplayConfig } from './GrayboxConfig';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

export class PlayerMotion {
  public y = 0;
  public velocityY = 0;
  public rotationDegrees = 0;

  public constructor(private readonly config: GrayboxGameplayConfig) {}

  public reset(y: number): void {
    this.y = y;
    this.velocityY = 0;
    this.rotationDegrees = 0;
  }

  public flap(): void {
    this.velocityY = clamp(
      this.config.flapVelocity,
      this.config.maxFallSpeed,
      this.config.maxRiseSpeed,
    );
  }

  public step(deltaTime: number): void {
    this.velocityY = clamp(
      this.velocityY + this.config.gravity * deltaTime,
      this.config.maxFallSpeed,
      this.config.maxRiseSpeed,
    );
    this.y += this.velocityY * deltaTime;

    const speedRange = this.config.maxRiseSpeed - this.config.maxFallSpeed;
    const normalizedSpeed = (this.velocityY - this.config.maxFallSpeed) / speedRange;
    const targetAngle = lerp(
      this.config.maxFallAngle,
      this.config.maxRiseAngle,
      clamp(normalizedSpeed, 0, 1),
    );
    const response = clamp(this.config.rotationResponse * deltaTime, 0, 1);
    this.rotationDegrees = lerp(this.rotationDegrees, targetAngle, response);
  }
}


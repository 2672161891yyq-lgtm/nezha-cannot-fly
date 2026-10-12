export class ObstacleScoreGate {
  private scored = false;
  private runtimeId = 0;

  public reset(runtimeId: number): void {
    this.runtimeId = runtimeId;
    this.scored = false;
  }

  public clear(): void {
    this.runtimeId = 0;
    this.scored = false;
  }

  public tryPass(obstacleX: number, playerX: number): boolean {
    if (this.runtimeId === 0 || this.scored || obstacleX >= playerX) {
      return false;
    }

    this.scored = true;
    return true;
  }
}

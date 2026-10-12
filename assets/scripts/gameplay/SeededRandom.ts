export interface RandomSource {
  next(): number;
  reset?(seed: number): void;
}

export class SeededRandom implements RandomSource {
  private state = 1;

  public constructor(seed: number) {
    this.reset(seed);
  }

  public reset(seed: number): void {
    const normalizedSeed = seed >>> 0;
    this.state = normalizedSeed === 0 ? 0x6d2b79f5 : normalizedSeed;
  }

  public next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x100000000;
  }
}

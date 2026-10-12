export class FixedObjectPool<T extends object> {
  private readonly items: T[] = [];
  private readonly available: T[] = [];
  private readonly active = new Set<T>();

  public constructor(factory: () => T, size: number) {
    if (!Number.isInteger(size) || size <= 0) {
      throw new Error('Pool size must be a positive integer.');
    }

    for (let index = 0; index < size; index += 1) {
      const item = factory();
      this.items.push(item);
      this.available.push(item);
    }
  }

  public get capacity(): number {
    return this.items.length;
  }

  public get activeCount(): number {
    return this.active.size;
  }

  public get availableCount(): number {
    return this.available.length;
  }

  public acquire(): T {
    const item = this.available.pop();
    if (!item) {
      throw new Error('Obstacle pool exhausted.');
    }

    this.active.add(item);
    return item;
  }

  public release(item: T): void {
    if (!this.active.delete(item)) {
      throw new Error('Cannot release an inactive pool item.');
    }

    this.available.push(item);
  }

  public reset(): void {
    this.active.clear();
    this.available.length = 0;
    for (let index = 0; index < this.items.length; index += 1) {
      this.available.push(this.items[index]);
    }
  }
}

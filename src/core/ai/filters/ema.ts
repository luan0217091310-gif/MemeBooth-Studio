export class Ema {
  private value: number | undefined
  constructor(public alpha = 0.3) {}
  reset(): void {
    this.value = undefined
  }
  next(sample: number): number {
    this.value =
      this.value === undefined
        ? sample
        : this.value + this.alpha * (sample - this.value)
    return this.value
  }
  get current(): number {
    return this.value ?? 0
  }
}

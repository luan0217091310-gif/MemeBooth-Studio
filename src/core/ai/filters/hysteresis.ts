// Two-threshold latch: turns on above `enter`, turns off below `exit`.
export class Hysteresis {
  active = false
  constructor(
    public enter: number,
    public exit: number,
  ) {}
  update(value: number): boolean {
    if (this.active) {
      if (value < this.exit) this.active = false
    } else if (value > this.enter) this.active = true
    return this.active
  }
  /** Inverted latch for "smaller is active" metrics like pinch distance. */
  updateBelow(value: number): boolean {
    if (this.active) {
      if (value > this.exit) this.active = false
    } else if (value < this.enter) this.active = true
    return this.active
  }
}

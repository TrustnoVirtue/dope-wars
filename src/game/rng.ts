export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  static randomSeed(): number {
    return Math.floor(Math.random() * 0xffffffff) >>> 0
  }

  getState(): number {
    return this.state
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!
  }

  weighted<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0)
    if (total <= 0) return items[0]!.value
    let roll = this.next() * total
    for (const item of items) {
      roll -= Math.max(0, item.weight)
      if (roll <= 0) return item.value
    }
    return items[items.length - 1]!.value
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

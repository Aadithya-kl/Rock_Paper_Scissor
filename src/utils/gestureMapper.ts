import type { GestureLabel } from '../db/db';

export class TemporalSmoother {
  private history: GestureLabel[] = [];
  private windowSize: number;

  constructor(windowSize: number = 5) {
    this.windowSize = windowSize;
  }

  pushAndGetSmoothed(gesture: GestureLabel | 'NO HAND' | 'UNCERTAIN'): GestureLabel | 'NO HAND' | 'UNCERTAIN' {
    this.history.push(gesture as any);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    const counts: Record<string, number> = {};
    let maxCount = 0;
    let mostFrequent = 'NO HAND';

    for (const g of this.history) {
      counts[g] = (counts[g] || 0) + 1;
      if (counts[g] > maxCount) {
        maxCount = counts[g];
        mostFrequent = g;
      }
    }

    return mostFrequent as any;
  }
  
  clear() {
    this.history = [];
  }
}

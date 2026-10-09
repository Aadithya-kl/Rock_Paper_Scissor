import Dexie, { type Table } from 'dexie';

export type GestureLabel = 'ROCK' | 'PAPER' | 'SCISSORS' | 'OTHER';

export interface LandmarkSample {
  id?: number;
  sessionId: string;
  label: GestureLabel;
  features: number[];
  viewingAngle: number | string; // Orientation string or legacy number
  timestamp: number;
}

export interface ModelArtifacts {
  id?: number;
  modelTopology: any;
  weightSpecs: any;
  weightData: ArrayBuffer;
  timestamp: number;
}

export class GestureDB extends Dexie {
  samples!: Table<LandmarkSample, number>;
  models!: Table<ModelArtifacts, number>;

  constructor() {
    super('GestureDB');
    this.version(1).stores({
      samples: '++id, sessionId, label, viewingAngle, timestamp',
      models: '++id, timestamp'
    });
  }
}

export const db = new GestureDB();

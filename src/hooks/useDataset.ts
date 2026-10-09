import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type GestureLabel } from '../db/db';

export function useDataset() {
  const samples = useLiveQuery(() => db.samples.toArray()) || [];
  
  const getSampleCount = useCallback((label: GestureLabel, angle?: number | string) => {
    if (angle !== undefined) {
       return samples.filter(s => s.label === label && s.viewingAngle === angle).length;
    }
    return samples.filter(s => s.label === label).length;
  }, [samples]);

  const addSample = useCallback(async (label: GestureLabel, features: number[], viewingAngle: number | string, sessionId: string) => {
    // Basic deduplication: Check if the last sample for this label/angle is identical or extremely close.
    // In a real robust system, we would calculate cosine similarity or L2 distance.
    const recentSamples = await db.samples
       .where('label').equals(label)
       .toArray();
       
    // Just grab the most recent one for simple dedup
    const last = recentSamples[recentSamples.length - 1];
    if (last) {
       let diffSum = 0;
       for (let i = 0; i < features.length; i++) {
          diffSum += Math.abs(features[i] - last.features[i]);
       }
       if (diffSum < 0.1) {
          // Too similar to the last frame, reject
          return false;
       }
    }
    
    await db.samples.add({
       sessionId,
       label,
       features,
       viewingAngle,
       timestamp: Date.now()
    });
    return true;
  }, []);

  const clearDataset = useCallback(async () => {
    await db.samples.clear();
  }, []);
  
  const deleteSample = useCallback(async (id: number) => {
    await db.samples.delete(id);
  }, []);

  const exportDatasetJSON = useCallback(async () => {
     const allSamples = await db.samples.toArray();
     const data = JSON.stringify({ version: 1, samples: allSamples }, null, 2);
     const blob = new Blob([data], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = 'gesture_dataset.json';
     link.click();
  }, []);

  const importDatasetJSON = useCallback(async (file: File) => {
     const text = await file.text();
     try {
        const data = JSON.parse(text);
        if (data.version === 1 && Array.isArray(data.samples)) {
           await db.samples.bulkAdd(data.samples);
           return true;
        }
     } catch (e) {
        return false;
     }
     return false;
  }, []);

  return {
    samples,
    getSampleCount,
    addSample,
    clearDataset,
    deleteSample,
    exportDatasetJSON,
    importDatasetJSON
  };
}

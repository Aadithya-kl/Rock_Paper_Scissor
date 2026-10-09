import { useState, useCallback } from 'react';
import type { GestureLabel } from '../db/db';

export interface TestTrial {
  id: string;
  expected: GestureLabel;
  predicted: GestureLabel | 'NO HAND' | 'UNCERTAIN';
  confidence: number;
  isCorrect: boolean;
  timestamp: number;
}

export function useEvaluation() {
  const [trials, setTrials] = useState<TestTrial[]>([]);

  const recordTrial = useCallback((expected: GestureLabel, predicted: GestureLabel | 'NO HAND' | 'UNCERTAIN', confidence: number) => {
    const trial: TestTrial = {
      id: Date.now().toString(),
      expected,
      predicted,
      confidence,
      isCorrect: expected === predicted,
      timestamp: Date.now(),
    };
    setTrials((prev) => [...prev, trial]);
  }, []);

  const resetTrials = useCallback(() => {
    setTrials([]);
  }, []);

  const getAccuracy = () => {
    if (trials.length === 0) return 0;
    const correct = trials.filter((t) => t.isCorrect).length;
    return (correct / trials.length) * 100;
  };

  const getClassAccuracy = (cls: GestureLabel) => {
    const classTrials = trials.filter((t) => t.expected === cls);
    if (classTrials.length === 0) return 0;
    const correct = classTrials.filter((t) => t.isCorrect).length;
    return (correct / classTrials.length) * 100;
  };
  
  const getClassCount = (cls: GestureLabel) => {
      return trials.filter(t => t.expected === cls).length;
  }

  return {
    trials,
    recordTrial,
    resetTrials,
    getAccuracy,
    getClassAccuracy,
    getClassCount
  };
}

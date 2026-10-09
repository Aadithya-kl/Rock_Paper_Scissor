import { useState, useCallback } from 'react';
import type { GestureLabel } from '../db/db';
import { calculateProgress, type CoverageMap } from '../utils/guidanceLogic';

export type EnrollmentState = 'IDLE' | 'ENROLLING' | 'TRAINING' | 'COMPLETE';

const STAGES: GestureLabel[] = ['ROCK', 'PAPER', 'SCISSORS'];

export function useEnrollment(clearDataset: () => Promise<void>) {
  const [enrollmentState, setEnrollmentState] = useState<EnrollmentState>('IDLE');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [progress, setProgress] = useState(0);

  const currentGesture = STAGES[currentStageIndex];

  const startEnrollment = useCallback(async () => {
    await clearDataset();
    setEnrollmentState('ENROLLING');
    setCurrentStageIndex(0);
    setProgress(0);
    setIsPaused(false);
    setSessionId(`enroll_${Date.now()}`);
  }, [clearDataset]);

  const pauseEnrollment = useCallback(() => setIsPaused(true), []);
  const resumeEnrollment = useCallback(() => setIsPaused(false), []);
  
  const cancelEnrollment = useCallback(() => {
    setEnrollmentState('IDLE');
    setCurrentStageIndex(0);
    setProgress(0);
    setIsPaused(false);
  }, []);

  const restartCurrentGesture = useCallback(() => {
     // Usually would also clear db samples for this gesture in this session, 
     // but the UI will handle that or just overwrite.
     setProgress(0);
     setIsPaused(false);
  }, []);

  const checkProgress = useCallback((coverage: CoverageMap) => {
     if (enrollmentState !== 'ENROLLING' || isPaused) return;
     
     const pct = calculateProgress(coverage, 2); // target 2 samples per region
     setProgress(pct);
     
     if (pct >= 100) {
        // Complete current stage
        if (currentStageIndex < STAGES.length - 1) {
           setCurrentStageIndex(prev => prev + 1);
           setProgress(0);
        } else {
           // All stages done, move to training
           setEnrollmentState('TRAINING');
        }
     }
  }, [enrollmentState, isPaused, currentStageIndex]);

  const markTrainingComplete = useCallback(() => {
      setEnrollmentState('COMPLETE');
  }, []);

  return {
    enrollmentState,
    currentGesture,
    isPaused,
    sessionId,
    progress,
    startEnrollment,
    pauseEnrollment,
    resumeEnrollment,
    cancelEnrollment,
    restartCurrentGesture,
    checkProgress,
    markTrainingComplete
  };
}

import type { OrientationCategory } from './orientationEstimation';

export interface CoverageMap {
  [key: string]: number;
}

const REGIONS: OrientationCategory[] = [
  'FRONT',
  'LEFT_45',
  'LEFT_90',
  'BACK',
  'RIGHT_90',
  'RIGHT_45',
  'TILT_UP',
  'TILT_DOWN'
];

export function getNextGuidance(currentOrientation: OrientationCategory, coverage: CoverageMap, targetPerRegion = 2): { instruction: string, arrow: string | null } {
  // If current orientation is not fully covered, instruct to hold still
  if (currentOrientation !== 'UNKNOWN' && (coverage[currentOrientation] || 0) < targetPerRegion) {
     return { instruction: 'Hold your hand steady. Capturing...', arrow: null };
  }

  // Find missing regions
  const missing = REGIONS.filter(r => (coverage[r] || 0) < targetPerRegion);
  
  if (missing.length === 0) {
     return { instruction: 'Stage complete!', arrow: null };
  }

  // If we don't know where they are, just ask them to start at front
  if (currentOrientation === 'UNKNOWN') {
     if ((coverage['FRONT'] || 0) < targetPerRegion) {
        return { instruction: 'Face your palm toward the camera.', arrow: null };
     }
     return { instruction: 'Hold your hand clearly in view.', arrow: null };
  }

  // Simple heuristic routing:
  // If we are at FRONT, and LEFT is missing, go LEFT.
  
  // Let's define a basic map of suggestions from current
  if (currentOrientation === 'FRONT') {
     if (missing.includes('LEFT_45') || missing.includes('LEFT_90')) return { instruction: 'Slowly rotate left.', arrow: 'left' };
     if (missing.includes('RIGHT_45') || missing.includes('RIGHT_90')) return { instruction: 'Slowly rotate right.', arrow: 'right' };
     if (missing.includes('TILT_UP')) return { instruction: 'Tilt your hand upward.', arrow: 'up' };
     if (missing.includes('TILT_DOWN')) return { instruction: 'Tilt your hand downward.', arrow: 'down' };
     if (missing.includes('BACK')) return { instruction: 'Turn to show the back of your hand.', arrow: 'flip' };
  }
  
  if (currentOrientation.startsWith('LEFT')) {
     if (missing.includes('LEFT_90') && currentOrientation === 'LEFT_45') return { instruction: 'Rotate further left.', arrow: 'left' };
     if (missing.includes('BACK')) return { instruction: 'Continue rotating to show the back of your hand.', arrow: 'left' };
     // If done with left side, go back to front or right
     return { instruction: 'Rotate back towards the center.', arrow: 'right' };
  }

  if (currentOrientation.startsWith('RIGHT')) {
     if (missing.includes('RIGHT_90') && currentOrientation === 'RIGHT_45') return { instruction: 'Rotate further right.', arrow: 'right' };
     if (missing.includes('BACK')) return { instruction: 'Continue rotating to show the back of your hand.', arrow: 'right' };
     return { instruction: 'Rotate back towards the center.', arrow: 'left' };
  }
  
  if (currentOrientation === 'BACK') {
     if (missing.includes('FRONT')) return { instruction: 'Turn your palm to face the camera.', arrow: 'flip' };
     if (missing.includes('LEFT_45') || missing.includes('LEFT_90')) return { instruction: 'Rotate towards the left.', arrow: 'left' };
     if (missing.includes('RIGHT_45') || missing.includes('RIGHT_90')) return { instruction: 'Rotate towards the right.', arrow: 'right' };
  }

  if (currentOrientation.startsWith('TILT')) {
     if (missing.includes('FRONT')) return { instruction: 'Return to a normal front-facing view.', arrow: 'down' };
     if (missing.includes('TILT_UP') && currentOrientation === 'TILT_DOWN') return { instruction: 'Tilt your hand upward.', arrow: 'up' };
     if (missing.includes('TILT_DOWN') && currentOrientation === 'TILT_UP') return { instruction: 'Tilt your hand downward.', arrow: 'down' };
  }

  // Fallback
  const nextTarget = missing[0];
  if (nextTarget.includes('LEFT')) return { instruction: 'Rotate left.', arrow: 'left' };
  if (nextTarget.includes('RIGHT')) return { instruction: 'Rotate right.', arrow: 'right' };
  if (nextTarget.includes('BACK')) return { instruction: 'Show the back of your hand.', arrow: 'flip' };
  if (nextTarget.includes('TILT_UP')) return { instruction: 'Tilt upward.', arrow: 'up' };
  if (nextTarget.includes('TILT_DOWN')) return { instruction: 'Tilt downward.', arrow: 'down' };
  
  return { instruction: 'Please show a different angle.', arrow: null };
}

export function calculateProgress(coverage: CoverageMap, targetPerRegion = 2): number {
   let totalNeeded = REGIONS.length * targetPerRegion;
   let totalHave = 0;
   for (const r of REGIONS) {
      totalHave += Math.min(coverage[r] || 0, targetPerRegion);
   }
   return Math.min(100, Math.round((totalHave / totalNeeded) * 100));
}

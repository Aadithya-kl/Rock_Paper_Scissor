import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export function extractFeatures(
  landmarks: NormalizedLandmark[], 
  worldLandmarks: NormalizedLandmark[]
): number[] | null {
  if (!landmarks || landmarks.length !== 21 || !worldLandmarks || worldLandmarks.length !== 21) {
    return null;
  }

  const features: number[] = [];
  
  // Wrist is index 0
  const wrist2D = landmarks[0];
  const wrist3D = worldLandmarks[0];

  // We will collect both 2D (projected) and 3D (world) relative to wrist
  for (let i = 0; i < 21; i++) {
    // 2D image landmarks (contains orientation/projection info)
    features.push(landmarks[i].x - wrist2D.x);
    features.push(landmarks[i].y - wrist2D.y);
    features.push(landmarks[i].z - wrist2D.z);

    // 3D world landmarks (contains pure hand shape info, scale-invariant in meters)
    features.push(worldLandmarks[i].x - wrist3D.x);
    features.push(worldLandmarks[i].y - wrist3D.y);
    features.push(worldLandmarks[i].z - wrist3D.z);
  }

  // Optional: Normalize the feature vector to standard scale
  // But since 2D is normalized [0,1] and 3D is in meters, standardizing the whole vector might break relative proportions.
  // We can just rely on the neural network to learn the scales, or normalize them separately.
  // For simplicity and stability, max absolute scaling could be applied per domain.
  
  let maxAbs2D = 0;
  let maxAbs3D = 0;
  
  for (let i = 0; i < 21; i++) {
    maxAbs2D = Math.max(
       maxAbs2D, 
       Math.abs(features[i*6]), 
       Math.abs(features[i*6 + 1]), 
       Math.abs(features[i*6 + 2])
    );
    maxAbs3D = Math.max(
       maxAbs3D, 
       Math.abs(features[i*6 + 3]), 
       Math.abs(features[i*6 + 4]), 
       Math.abs(features[i*6 + 5])
    );
  }
  
  if (maxAbs2D === 0 || maxAbs3D === 0) return features;

  for (let i = 0; i < 21; i++) {
    features[i*6] /= maxAbs2D;
    features[i*6 + 1] /= maxAbs2D;
    features[i*6 + 2] /= maxAbs2D;
    
    features[i*6 + 3] /= maxAbs3D;
    features[i*6 + 4] /= maxAbs3D;
    features[i*6 + 5] /= maxAbs3D;
  }

  return features;
}

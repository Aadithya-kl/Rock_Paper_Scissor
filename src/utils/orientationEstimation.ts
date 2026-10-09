import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type OrientationCategory = 
  | 'FRONT' 
  | 'LEFT_45'
  | 'LEFT_90'
  | 'BACK'
  | 'RIGHT_90'
  | 'RIGHT_45'
  | 'TILT_UP'
  | 'TILT_DOWN'
  | 'UNKNOWN';

export function estimateHandOrientation(
  landmarks: NormalizedLandmark[], 
  worldLandmarks: NormalizedLandmark[]
): OrientationCategory {
  if (!landmarks || landmarks.length < 21 || !worldLandmarks || worldLandmarks.length < 21) {
    return 'UNKNOWN';
  }

  // Use world landmarks for depth/rotation estimation (more scale invariant)
  // Index 0: Wrist
  // Index 5: Index Finger MCP
  // Index 17: Pinky MCP
  // Index 9: Middle Finger MCP
  
  const wrist = worldLandmarks[0];
  const indexMcp = worldLandmarks[5];
  const pinkyMcp = worldLandmarks[17];
  const middleMcp = worldLandmarks[9];

  // Vectors from wrist
  const vIndex = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y, z: indexMcp.z - wrist.z };
  const vPinky = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y, z: pinkyMcp.z - wrist.z };
  const vMiddle = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y, z: middleMcp.z - wrist.z };

  // Cross product of vIndex and vPinky gives the palm normal vector
  const normal = {
    x: vIndex.y * vPinky.z - vIndex.z * vPinky.y,
    y: vIndex.z * vPinky.x - vIndex.x * vPinky.z,
    z: vIndex.x * vPinky.y - vIndex.y * vPinky.x
  };

  // Normalize the normal vector
  const mag = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  if (mag === 0) return 'UNKNOWN';
  normal.x /= mag;
  normal.y /= mag;
  normal.z /= mag;

  // Evaluate tilt (Up/Down) based on Middle MCP Y relative to wrist
  // Compare wrist and middle fingertip (12) or MCP (9) in 3D
  // If Z difference is very large compared to Y difference, it's tilted towards/away from camera
  if (vMiddle.z < -0.05 && Math.abs(vMiddle.y) < 0.05) {
     // Fingers pointing toward camera
     return 'TILT_DOWN';
  }
  if (vMiddle.z > 0.05 && Math.abs(vMiddle.y) < 0.05) {
     // Fingers pointing away from camera
     return 'TILT_UP';
  }

  // Left/Right rotation based on the normal's X and Z components
  // normal.z < 0 usually means palm is facing the camera
  // normal.x determines left/right rotation
  
  const isBack = normal.z > 0.5;
  
  if (isBack) {
     return 'BACK';
  }

  if (normal.x < -0.6) {
     return 'LEFT_90'; // Extreme left
  } else if (normal.x < -0.2) {
     return 'LEFT_45';
  } else if (normal.x > 0.6) {
     return 'RIGHT_90';
  } else if (normal.x > 0.2) {
     return 'RIGHT_45';
  }

  return 'FRONT';
}

export const ORIENTATION_PROMPTS: Record<OrientationCategory, string> = {
  'FRONT': 'Face your palm toward the camera.',
  'LEFT_45': 'Slowly rotate your hand slightly to the left.',
  'LEFT_90': 'Turn your wrist to show the left side profile.',
  'BACK': 'Show the back of your hand.',
  'RIGHT_90': 'Turn your wrist to show the right side profile.',
  'RIGHT_45': 'Rotate your hand slightly to the right.',
  'TILT_UP': 'Tilt your fingers pointing upward/away.',
  'TILT_DOWN': 'Tilt your fingers pointing downward/towards.',
  'UNKNOWN': 'Hold your hand clearly in view.'
};

// Target sequences to guide the user through
export const ENROLLMENT_SEQUENCE: OrientationCategory[] = [
  'FRONT',
  'LEFT_45',
  'LEFT_90',
  'BACK',
  'RIGHT_90',
  'RIGHT_45',
  'TILT_UP',
  'TILT_DOWN'
];

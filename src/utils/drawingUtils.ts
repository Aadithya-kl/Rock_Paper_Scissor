import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

export function drawLandmarks(
  canvas: HTMLCanvasElement,
  results: HandLandmarkerResult
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.landmarks) {
    const drawingUtils = new DrawingUtils(ctx);
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 3,
      });
      drawingUtils.drawLandmarks(landmarks, {
        color: '#FF0000',
        lineWidth: 2,
        radius: 3,
      });
    }
  }
}

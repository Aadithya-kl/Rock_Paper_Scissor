import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

export function useHandLandmarker() {
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  const lastVideoTimeRef = useRef<number>(-1);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const requestRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  useEffect(() => {
    async function init() {
      try {
        setIsInitializing(true);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setLandmarker(handLandmarker);
        setIsInitializing(false);
      } catch (err: any) {
        setInitError(err.message || 'Failed to initialize Hand Landmarker.');
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  const processVideo = useCallback((
    video: HTMLVideoElement, 
    onResult?: (result: HandLandmarkerResult) => void
  ) => {
    if (!landmarker || !video || video.readyState !== 4) {
      if (isRunningRef.current) {
        requestRef.current = requestAnimationFrame(() => processVideo(video, onResult));
      }
      return;
    }

    const nowInMs = Date.now();
    let results: HandLandmarkerResult | null = null;
    
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      results = landmarker.detectForVideo(video, nowInMs);
      
      // Calculate FPS
      frameCountRef.current++;
      const currentPerfTime = performance.now();
      if (currentPerfTime - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = currentPerfTime;
      }
      
      if (results && onResult) {
        onResult(results);
      }
    }

    if (isRunningRef.current) {
      requestRef.current = requestAnimationFrame(() => processVideo(video, onResult));
    }
  }, [landmarker]);

  const startProcessing = useCallback((video: HTMLVideoElement, onResult?: (r: HandLandmarkerResult) => void) => {
    isRunningRef.current = true;
    requestRef.current = requestAnimationFrame(() => processVideo(video, onResult));
  }, [processVideo]);

  const stopProcessing = useCallback(() => {
    isRunningRef.current = false;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    setFps(0);
  }, []);

  return {
    landmarker,
    isInitializing,
    initError,
    fps,
    startProcessing,
    stopProcessing
  };
}

import { useEffect, useRef, useState } from 'react';
import { CameraOff, RefreshCw, BrainCircuit, Activity, Play, Pause, Sparkles } from 'lucide-react';
import { useWebcam } from './hooks/useWebcam';
import { useHandLandmarker } from './hooks/useHandLandmarker';
import { extractFeatures } from './utils/featureExtraction';
import { useDataset } from './hooks/useDataset';
import { useTraining } from './hooks/useTraining';
import { TemporalSmoother } from './utils/gestureMapper';
import type { GestureLabel } from './db/db';
import { drawLandmarks } from './utils/drawingUtils';
import { estimateHandOrientation, ENROLLMENT_SEQUENCE } from './utils/orientationEstimation';
import { getNextGuidance } from './utils/guidanceLogic';
import { useEnrollment } from './hooks/useEnrollment';
import { RpsGame } from './components/RpsGame';
import { TargetHandGuide } from './components/TargetHandGuide';

function App() {
  const { videoRef, isCameraActive, startCamera } = useWebcam();
  const { isInitializing, startProcessing, stopProcessing } = useHandLandmarker();
  const { getSampleCount, addSample, clearDataset } = useDataset();
  const { isTraining, error: trainError, modelLoaded, trainModel, loadSavedModel, predict } = useTraining();
  
  const { 
     enrollmentState, currentGesture, isPaused, sessionId, progress,
     startEnrollment, pauseEnrollment, resumeEnrollment, cancelEnrollment, restartCurrentGesture, checkProgress, markTrainingComplete
  } = useEnrollment(clearDataset);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [activeTab, setActiveTab] = useState<'COLLECT' | 'GAME'>('COLLECT');
  
  // State for Inference & Collection
  const smootherRef = useRef(new TemporalSmoother(5));
  const [smoothedGesture, setSmoothedGesture] = useState<GestureLabel | 'NO HAND' | 'UNCERTAIN'>('NO HAND');
  const [isHandDetected, setIsHandDetected] = useState(false);
  
  const [guidanceMsg, setGuidanceMsg] = useState('Place your hand inside the guide.');
  const [guidanceArrow, setGuidanceArrow] = useState<string | null>(null);

  const lastCaptureTimeRef = useRef<number>(0);
  const stableFramesRef = useRef<number>(0);

  // Sync canvas size with video size
  useEffect(() => {
    if (videoRef.current && canvasRef.current && isCameraActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const onResize = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };
      video.addEventListener('loadedmetadata', onResize);
      return () => video.removeEventListener('loadedmetadata', onResize);
    }
  }, [isCameraActive, videoRef]);

  // Load existing model on mount
  useEffect(() => {
     loadSavedModel();
  }, [loadSavedModel]);

  // Main Loop
  useEffect(() => {
    if (isCameraActive && videoRef.current && !isInitializing) {
      startProcessing(videoRef.current, async (results) => {
         if (canvasRef.current) {
            drawLandmarks(canvasRef.current, results);
         }
         
         if (results.landmarks && results.landmarks.length > 0 && results.worldLandmarks && results.worldLandmarks.length > 0) {
            setIsHandDetected(true);
            stableFramesRef.current++;
            const lms = results.landmarks[0];
            const wLms = results.worldLandmarks[0];
            
            const features = extractFeatures(lms, wLms);
            const orientation = estimateHandOrientation(lms, wLms);
            
            // Prediction logic
            if (features && modelLoaded && activeTab === 'GAME') {
               const pred = predict(features);
               if (pred) {
                  const confThresh = 0.6;
                  setSmoothedGesture(smootherRef.current.pushAndGetSmoothed(pred.confidence > confThresh ? pred.label : 'UNCERTAIN'));
               } else {
                  setSmoothedGesture(smootherRef.current.pushAndGetSmoothed('UNCERTAIN'));
               }
            } else {
               // Fast smoothing bypass when not in game
               setSmoothedGesture('NO HAND');
            }

            // Auto-capture Logic
            if (enrollmentState === 'ENROLLING' && !isPaused && features) {
               // Determine coverage and next guidance
               const coverage: Record<string, number> = {};
               ENROLLMENT_SEQUENCE.forEach(ang => {
                  coverage[ang] = getSampleCount(currentGesture, ang);
               });
               
               const { instruction, arrow } = getNextGuidance(orientation, coverage, 2);
               setGuidanceMsg(instruction);
               setGuidanceArrow(arrow);
               
               // Capture if hand is stable (been seen for ~5 frames)
               if (stableFramesRef.current > 5 && orientation !== 'UNKNOWN') {
                  // Only capture if this orientation needs more samples
                  if ((coverage[orientation] || 0) < 2) {
                     const now = Date.now();
                     if (now - lastCaptureTimeRef.current > 600) { // 600ms between captures
                        const added = await addSample(currentGesture, features, orientation, sessionId);
                        if (added) {
                           lastCaptureTimeRef.current = now;
                           setGuidanceMsg('Great! Capturing sample...');
                        }
                     }
                  }
               }
            }

         } else {
            setIsHandDetected(false);
            stableFramesRef.current = 0;
            setSmoothedGesture(smootherRef.current.pushAndGetSmoothed('NO HAND'));
            
            if (enrollmentState === 'ENROLLING' && !isPaused) {
               setGuidanceMsg('Place your hand inside the guide.');
               setGuidanceArrow(null);
            }
         }
      });
    } else {
      stopProcessing();
      if (canvasRef.current) {
         const ctx = canvasRef.current.getContext('2d');
         ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [isCameraActive, isInitializing, startProcessing, stopProcessing, videoRef, modelLoaded, predict, enrollmentState, isPaused, currentGesture, sessionId, addSample, getSampleCount, activeTab]);
  
  // Progress Check Loop
  useEffect(() => {
     if (enrollmentState === 'ENROLLING' && !isPaused) {
        const interval = setInterval(() => {
           const coverage: Record<string, number> = {};
           ENROLLMENT_SEQUENCE.forEach(ang => {
              coverage[ang] = getSampleCount(currentGesture, ang);
           });
           checkProgress(coverage);
        }, 1000);
        return () => clearInterval(interval);
     }
  }, [enrollmentState, isPaused, currentGesture, getSampleCount, checkProgress]);

  // Transition to Training when COMPLETED
  useEffect(() => {
     if (enrollmentState === 'TRAINING' && !isTraining && !modelLoaded) {
        trainModel(50, 32).then(() => {
           markTrainingComplete();
        });
     }
  }, [enrollmentState, isTraining, modelLoaded, trainModel, markTrainingComplete]);

  // Transition to Game when Training COMPLETE
  useEffect(() => {
     if (enrollmentState === 'COMPLETE' && activeTab === 'COLLECT') {
        setTimeout(() => setActiveTab('GAME'), 1500);
     }
  }, [enrollmentState, activeTab]);

  return (
    <div className="min-h-screen bg-navy-900 text-slate-200 font-sans p-6 flex flex-col">
      <header className="mb-6 flex-shrink-0 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-400 tracking-tight flex items-center">
           <BrainCircuit className="mr-3 w-8 h-8" /> Gesture Scanner
        </h1>
        {activeTab === 'GAME' && (
           <button onClick={() => { setActiveTab('COLLECT'); cancelEnrollment(); }} className="text-sm text-slate-400 hover:text-white">
              &larr; Back to Setup
           </button>
        )}
      </header>
      
      {activeTab === 'COLLECT' && (
         <div className="flex-1 max-w-5xl mx-auto w-full grid grid-cols-1 gap-8">
            {/* STAGE INDICATOR */}
            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg z-20">
               {['ROCK', 'PAPER', 'SCISSORS'].map((stage, idx) => {
                  const isActive = enrollmentState === 'ENROLLING' && currentGesture === stage;
                  const isDone = ['ROCK', 'PAPER', 'SCISSORS'].indexOf(currentGesture) > idx || enrollmentState === 'TRAINING' || enrollmentState === 'COMPLETE';
                  return (
                     <div key={stage} className={`flex-1 text-center border-b-4 pb-2 ${isActive ? 'border-blue-500 text-blue-400' : isDone ? 'border-emerald-500 text-emerald-500' : 'border-slate-600 text-slate-500'}`}>
                        <div className="text-sm font-bold tracking-widest">{stage}</div>
                        {isActive && <div className="text-xs mt-1 text-blue-300">{progress}%</div>}
                        {isDone && <div className="text-xs mt-1 text-emerald-300">Complete</div>}
                     </div>
                  )
               })}
            </div>

            {/* MAIN SCANNER AREA */}
            <div className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative aspect-video flex items-center justify-center">
               {/* Layer 1: Live Webcam Video */}
               <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] z-0 ${isCameraActive ? 'block' : 'hidden'}`} autoPlay playsInline muted />
               
               {/* Layer 2: Target SVG Guide */}
               {isCameraActive && enrollmentState === 'ENROLLING' && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none opacity-40">
                     <TargetHandGuide gesture={currentGesture} className="w-1/2 h-1/2 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                  </div>
               )}

               {/* Layer 3: Landmark Canvas Overlay */}
               <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none z-20 ${isCameraActive ? 'block' : 'hidden'}`} />
               
               {!isCameraActive ? (
                  <div className="text-center z-30 relative bg-slate-800/80 p-8 rounded-xl backdrop-blur-sm">
                     <CameraOff className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                     <p className="text-slate-300 mb-6">Camera required for Face ID-style enrollment.</p>
                     <button onClick={startCamera} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg">
                        Allow Camera
                     </button>
                  </div>
               ) : (
                  <>
                     {/* Layer 4/5: Instruction Overlays & Controls */}
                     {enrollmentState === 'IDLE' && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm z-30">
                           <Sparkles className="w-16 h-16 text-blue-400 mb-6 animate-pulse" />
                           <h2 className="text-3xl text-white font-bold mb-4">Personalize Your Gestures</h2>
                           <p className="text-slate-300 max-w-md text-center mb-8">
                              We will scan your hand from multiple angles to create a private, highly accurate Rock Paper Scissors AI.
                           </p>
                           <button onClick={startEnrollment} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform hover:scale-105 active:scale-95">
                              Start Live Scan
                           </button>
                        </div>
                     )}

                     {enrollmentState === 'ENROLLING' && (
                        <div className="absolute inset-0 z-30 pointer-events-none">
                           {/* Instruction Banner */}
                           <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-8 py-4 rounded-full border border-slate-600 shadow-xl flex items-center space-x-4">
                              <div className={`text-xl font-bold ${isHandDetected ? 'text-white' : 'text-red-400'}`}>
                                 {guidanceMsg}
                              </div>
                              {/* SVG Arrows instead of emojis */}
                              {guidanceArrow === 'left' && (
                                 <svg className="w-8 h-8 text-blue-400 animate-bounce-x" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                              )}
                              {guidanceArrow === 'right' && (
                                 <svg className="w-8 h-8 text-blue-400 animate-bounce-x" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                              )}
                              {guidanceArrow === 'up' && (
                                 <svg className="w-8 h-8 text-blue-400 animate-bounce" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                              )}
                              {guidanceArrow === 'down' && (
                                 <svg className="w-8 h-8 text-blue-400 animate-bounce" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                              )}
                              {guidanceArrow === 'flip' && (
                                 <svg className="w-8 h-8 text-blue-400 animate-spin-slow" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                              )}
                           </div>

                           {/* Controls */}
                           <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4 pointer-events-auto">
                              {isPaused ? (
                                 <button onClick={resumeEnrollment} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg border border-slate-600" title="Resume"><Play className="w-5 h-5"/></button>
                              ) : (
                                 <button onClick={pauseEnrollment} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg border border-slate-600" title="Pause"><Pause className="w-5 h-5"/></button>
                              )}
                              <button onClick={restartCurrentGesture} className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg border border-slate-600" title="Restart Stage"><RefreshCw className="w-5 h-5"/></button>
                           </div>
                        </div>
                     )}

                     {enrollmentState === 'TRAINING' && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-10">
                           <Activity className="w-16 h-16 text-emerald-400 mb-6 animate-pulse" />
                           <h2 className="text-3xl text-white font-bold mb-2">Training Local Model</h2>
                           <p className="text-slate-400 mb-8">Processing your unique hand geometry...</p>
                           {trainError && <p className="text-red-400 bg-red-900/30 p-4 rounded-lg">{trainError}</p>}
                           <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
                           </div>
                        </div>
                     )}

                     {enrollmentState === 'COMPLETE' && (
                        <div className="absolute inset-0 bg-emerald-900/40 flex flex-col items-center justify-center backdrop-blur-sm z-10 border-4 border-emerald-500 rounded-xl transition-all">
                           <h2 className="text-5xl text-emerald-400 font-bold mb-4 drop-shadow-lg">Ready to Play!</h2>
                           <p className="text-slate-200 text-xl font-medium">Launching game...</p>
                        </div>
                     )}
                  </>
               )}
            </div>
         </div>
      )}

      {activeTab === 'GAME' && (
         <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col relative">
            <RpsGame smoothedGesture={smoothedGesture} onQuit={() => setActiveTab('COLLECT')} />
            
            {/* Hidden live camera feed for the game to process in background */}
            <div className="absolute bottom-4 right-4 w-48 h-32 bg-black rounded-lg overflow-hidden border border-slate-700 shadow-2xl opacity-50 hover:opacity-100 transition-opacity">
               <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" autoPlay playsInline muted />
               <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none" />
               <div className="absolute bottom-1 left-1 bg-black/70 px-2 py-0.5 rounded text-[10px] text-blue-400 font-mono">
                  {smoothedGesture}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

export default App;

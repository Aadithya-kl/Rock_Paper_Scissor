import { useState, useCallback, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import { db, type GestureLabel } from '../db/db';

export const LABELS: GestureLabel[] = ['ROCK', 'PAPER', 'SCISSORS', 'OTHER'];
const NUM_CLASSES = LABELS.length;
const FEATURE_LENGTH = 126; // 21 landmarks * 3 coords * 2 (2D + 3D)

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  val_loss: number;
  acc: number;
  val_acc: number;
}

export function useTraining() {
  const [isTraining, setIsTraining] = useState(false);
  const [metrics, setMetrics] = useState<TrainingMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const modelRef = useRef<tf.Sequential | null>(null);
  
  // Custom stop flag
  const stopRequestedRef = useRef(false);

  const initModel = useCallback(() => {
    const model = tf.sequential();
    // Compact model for 126 features
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [FEATURE_LENGTH] }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: NUM_CLASSES, activation: 'softmax' }));
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    modelRef.current = model;
    setModelLoaded(true);
  }, []);

  const loadSavedModel = useCallback(async () => {
    try {
       // Since saving to indexeddb via TFJS is async and uses its own protocol 'indexeddb://'
       // we can use standard TFJS saving/loading. We don't strictly need our Dexie table for the model,
       // we can just use `indexeddb://personalized-gesture-model`.
       const model = await tf.loadLayersModel('indexeddb://personalized-gesture-model');
       
       model.compile({
          optimizer: tf.train.adam(0.001),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy']
       });
       
       modelRef.current = model as tf.Sequential;
       setModelLoaded(true);
       return true;
    } catch(e) {
       return false;
    }
  }, []);

  const trainModel = useCallback(async (epochs: number = 50, batchSize: number = 32) => {
    try {
      setError(null);
      setIsTraining(true);
      setMetrics([]);
      stopRequestedRef.current = false;

      // 1. Fetch data
      const samples = await db.samples.toArray();
      if (samples.length < 10) {
         throw new Error("Insufficient data for training. Collect more samples.");
      }
      
      // 2. Prepare data
      // Simple grouped split: 80/20 train/val, shuffling but ideally stratified.
      // For simplicity in this demo, random shuffle. To avoid leakage from sequential frames, 
      // we shuffle by sessionId if possible, but random is okay if we enforce unique samples at collection.
      tf.util.shuffle(samples);
      
      const inputs: number[][] = [];
      const labels: number[][] = [];
      
      samples.forEach(s => {
         inputs.push(s.features);
         const labelIdx = LABELS.indexOf(s.label);
         const oneHot = new Array(NUM_CLASSES).fill(0);
         oneHot[labelIdx] = 1;
         labels.push(oneHot);
      });
      
      const xs = tf.tensor2d(inputs, [inputs.length, FEATURE_LENGTH]);
      const ys = tf.tensor2d(labels, [labels.length, NUM_CLASSES]);
      
      if (!modelRef.current) {
          initModel();
      }
      
      // 3. Train
      await modelRef.current!.fit(xs, ys, {
         epochs,
         batchSize,
         validationSplit: 0.2,
         callbacks: {
            onEpochEnd: (epoch, logs) => {
               if (logs) {
                  setMetrics(prev => [...prev, {
                     epoch: epoch + 1,
                     loss: logs.loss,
                     val_loss: logs.val_loss,
                     acc: logs.acc,
                     val_acc: logs.val_acc
                  }]);
               }
               if (stopRequestedRef.current) {
                  modelRef.current!.stopTraining = true;
               }
            }
         }
      });
      
      // 4. Save model
      await modelRef.current!.save('indexeddb://personalized-gesture-model');
      
      xs.dispose();
      ys.dispose();
      
    } catch(e: any) {
       setError(e.message);
    } finally {
       setIsTraining(false);
    }
  }, [initModel]);

  const predict = useCallback((features: number[]): { label: GestureLabel, confidence: number } | null => {
     if (!modelRef.current || !modelLoaded) return null;
     
     return tf.tidy(() => {
        const input = tf.tensor2d([features], [1, FEATURE_LENGTH]);
        const prediction = modelRef.current!.predict(input) as tf.Tensor;
        const scores = prediction.dataSync();
        
        let maxScore = 0;
        let maxIdx = 0;
        for (let i = 0; i < NUM_CLASSES; i++) {
           if (scores[i] > maxScore) {
              maxScore = scores[i];
              maxIdx = i;
           }
        }
        
        return {
           label: LABELS[maxIdx],
           confidence: maxScore
        };
     });
  }, [modelLoaded]);
  
  const stopTraining = useCallback(() => {
      stopRequestedRef.current = true;
  }, []);
  
  const clearModel = useCallback(async () => {
      try {
         await tf.io.removeModel('indexeddb://personalized-gesture-model');
         modelRef.current = null;
         setModelLoaded(false);
         setMetrics([]);
      } catch (e) {
         // ignore
      }
  }, []);

  return {
     isTraining,
     metrics,
     error,
     modelLoaded,
     trainModel,
     stopTraining,
     loadSavedModel,
     predict,
     clearModel
  };
}

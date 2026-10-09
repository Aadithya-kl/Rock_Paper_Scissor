# Personalized Gesture Lab

A locally trainable, personalized hand-gesture recognition system built with React, Vite, MediaPipe Hand Landmarker, and TensorFlow.js.

## Features

- **Personalized Training**: Don't rely on generic models. Teach the system exactly what *your* hand signs look like.
- **Guided Collection Wizard**: Collect landmark data across 8 different viewing angles for ROCK, PAPER, SCISSORS, and OTHER.
- **Local TensorFlow.js Model**: Train a lightweight, fast neural network entirely in your browser. No data ever leaves your machine.
- **Feature Extraction**: Uses both 3D world landmarks and 2D image landmarks to achieve scale-invariance and orientation awareness.
- **IndexedDB Persistence**: Automatically saves your collected dataset and trained model to the browser's local storage.
- **Export / Import**: Share or backup your dataset and model weights locally.
- **Hold-Out Evaluation**: Empirically test your trained model against live data and view detailed accuracy stats and a confusion matrix.

## Technical Stack

- **Framework:** React + Vite + TypeScript
- **Styling:** Tailwind CSS v4
- **Computer Vision:** Google MediaPipe Tasks Vision (Hand Landmarker)
- **Machine Learning:** TensorFlow.js (@tensorflow/tfjs)
- **Database:** Dexie (IndexedDB)

## Installation & Setup

1. **Install Dependencies**
   Run the following command in the root of the project:
   ```bash
   npm install
   ```

2. **Run the Development Server**
   Start the local Vite server:
   ```bash
   npm run dev
   ```

3. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`.

## Usage Guide

### 1. Collect Data
- Navigate to the **COLLECT** tab.
- Select your target gesture (e.g., ROCK).
- Follow the prompt to angle your hand. Click **Capture Sample** when the hand is stable. Try to collect at least 10 samples per angle.
- Repeat for all angles and all gestures.

### 2. Train the Model
- Navigate to the **TRAIN** tab.
- Verify your dataset has enough samples.
- Click **Start Training**. Watch the epochs, loss, and validation accuracy. The model saves to your browser automatically.

### 3. Evaluate & Play
- Navigate to the **EVALUATE** tab.
- Perform a gesture and click **Record Test** to log a true evaluation trial.
- Review your confusion matrix and per-class accuracy to see where the model gets confused.

## Privacy & Persistence

This application operates 100% locally. 
Webcam frames are analyzed on the fly and discarded. Extracted numerical landmark vectors are stored in your browser's IndexedDB. Training happens locally. 

**Note on Persistence:**
If you clear your browser data or use Incognito mode, your dataset and trained model will be lost unless you export them first.

## Limitations

- The system relies on MediaPipe's underlying hand detection. If the hand is cut off by the edge of the frame, detection fails.
- Motion blur can result in distorted landmarks.
- Since it trains only on what you provide, the model is highly personalized and may not generalize well to other people unless they also add their hand samples to the dataset.

## License
MIT

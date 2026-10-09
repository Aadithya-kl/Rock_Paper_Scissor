import { useState, useEffect } from 'react';
import type { GestureLabel } from '../db/db';

interface Props {
  smoothedGesture: GestureLabel | 'NO HAND' | 'UNCERTAIN';
  onQuit: () => void;
}

type GameState = 'WAITING' | 'COUNTDOWN' | 'REVEAL';

export function RpsGame({ smoothedGesture, onQuit }: Props) {
  const [gameState, setGameState] = useState<GameState>('WAITING');
  const [countdown, setCountdown] = useState(3);
  const [playerScore, setPlayerScore] = useState(0);
  const [robotScore, setRobotScore] = useState(0);
  
  const [robotMove, setRobotMove] = useState<GestureLabel | null>(null);
  const [finalPlayerMove, setFinalPlayerMove] = useState<GestureLabel | null>(null);
  const [resultMsg, setResultMsg] = useState('');

  const startGame = () => {
     if (smoothedGesture === 'NO HAND' || smoothedGesture === 'UNCERTAIN' || smoothedGesture === 'OTHER') {
        alert("Please hold your hand clearly in view (Rock, Paper, or Scissors) to start.");
        return;
     }
     setGameState('COUNTDOWN');
     setCountdown(3);
     setRobotMove(null);
     setFinalPlayerMove(null);
     setResultMsg('');
  };

  useEffect(() => {
     if (gameState === 'COUNTDOWN') {
        if (countdown > 0) {
           const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
           return () => clearTimeout(timer);
        } else {
           // Reveal
           const moves: GestureLabel[] = ['ROCK', 'PAPER', 'SCISSORS'];
           const rMove = moves[Math.floor(Math.random() * moves.length)];
           setRobotMove(rMove);
           
           let pMoveRaw = smoothedGesture;
           let pMove: GestureLabel = 'ROCK'; // default fallback
           if (pMoveRaw !== 'NO HAND' && pMoveRaw !== 'UNCERTAIN' && pMoveRaw !== 'OTHER') {
              pMove = pMoveRaw as GestureLabel;
           }
           setFinalPlayerMove(pMove);
           
           // Calculate winner
           if (pMove === rMove) {
              setResultMsg("IT'S A TIE!");
           } else if (
              (pMove === 'ROCK' && rMove === 'SCISSORS') ||
              (pMove === 'PAPER' && rMove === 'ROCK') ||
              (pMove === 'SCISSORS' && rMove === 'PAPER')
           ) {
              setResultMsg("YOU WIN!");
              setPlayerScore(s => s + 1);
           } else {
              setResultMsg("ROBOT WINS!");
              setRobotScore(s => s + 1);
           }
           
           setGameState('REVEAL');
        }
     }
  }, [gameState, countdown, smoothedGesture]);

  const getRobotEmoji = (move: GestureLabel | null) => {
     if (move === 'ROCK') return '✊';
     if (move === 'PAPER') return '🖐️';
     if (move === 'SCISSORS') return '✌️';
     return '🤖';
  };

  const getPlayerEmoji = (move: GestureLabel | null) => {
     if (move === 'ROCK') return '✊';
     if (move === 'PAPER') return '🖐️';
     if (move === 'SCISSORS') return '✌️';
     return '👤';
  };

  return (
     <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-900 rounded-xl p-8 border border-slate-700 shadow-2xl relative">
        <button onClick={onQuit} className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors text-sm">
           &larr; Quit Game
        </button>

        <div className="flex w-full max-w-2xl justify-between items-center mb-12">
           <div className="text-center">
              <h2 className="text-blue-400 text-xl font-bold mb-2">YOU</h2>
              <div className="text-5xl font-mono text-white bg-blue-900/30 p-4 rounded-xl border border-blue-800 w-32 h-32 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                 {playerScore}
              </div>
           </div>
           
           <div className="text-center flex-1 mx-8">
              <h1 className="text-3xl font-bold text-slate-300 tracking-widest uppercase mb-2">VS</h1>
           </div>

           <div className="text-center">
              <h2 className="text-red-400 text-xl font-bold mb-2">ROBOT</h2>
              <div className="text-5xl font-mono text-white bg-red-900/30 p-4 rounded-xl border border-red-800 w-32 h-32 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                 {robotScore}
              </div>
           </div>
        </div>

        <div className="flex flex-col items-center w-full max-w-2xl">
           {gameState === 'WAITING' && (
              <div className="text-center">
                 <p className="text-slate-400 mb-6">Hold up Rock, Paper, or Scissors, then click Start.</p>
                 <button 
                    onClick={startGame}
                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                 >
                    START MATCH
                 </button>
              </div>
           )}

           {gameState === 'COUNTDOWN' && (
              <div className="text-center animate-pulse">
                 <div className="text-8xl font-bold text-blue-400 mb-4">{countdown}</div>
                 <p className="text-xl text-slate-300 uppercase tracking-widest">
                    {countdown === 3 ? 'ROCK...' : countdown === 2 ? 'PAPER...' : 'SCISSORS...'}
                 </p>
              </div>
           )}

           {gameState === 'REVEAL' && (
              <div className="w-full text-center">
                 <div className="flex justify-center items-center gap-16 mb-8">
                    <div className="flex flex-col items-center transform -scale-x-100">
                       <div className="text-8xl">{getPlayerEmoji(finalPlayerMove)}</div>
                       <div className="mt-4 text-blue-400 font-bold uppercase">{finalPlayerMove}</div>
                    </div>
                    <div className="text-4xl text-slate-500 font-bold">⚡</div>
                    <div className="flex flex-col items-center">
                       <div className="text-8xl">{getRobotEmoji(robotMove)}</div>
                       <div className="mt-4 text-red-400 font-bold uppercase">{robotMove}</div>
                    </div>
                 </div>
                 
                 <h2 className={`text-4xl font-bold mb-8 uppercase tracking-wider ${
                    resultMsg.includes('WIN') ? 'text-emerald-400' : resultMsg.includes('ROBOT') ? 'text-red-400' : 'text-yellow-400'
                 }`}>
                    {resultMsg}
                 </h2>

                 <button 
                    onClick={startGame}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                 >
                    PLAY AGAIN
                 </button>
              </div>
           )}
        </div>
     </div>
  );
}

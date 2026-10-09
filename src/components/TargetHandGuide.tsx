import type { GestureLabel } from '../db/db';

interface Props {
  gesture: GestureLabel;
  className?: string;
}

export function TargetHandGuide({ gesture, className = '' }: Props) {
  const baseClasses = `transition-all duration-500 ease-in-out ${className}`;

  if (gesture === 'ROCK') {
    return (
      <svg viewBox="0 0 100 100" className={baseClasses} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Wrist */}
        <path d="M40 90 L40 70 M60 90 L60 70" />
        <path d="M35 70 C 50 80, 65 70, 65 70" />
        {/* Folded Fingers (Fist) */}
        {/* Index */}
        <path d="M40 45 C 35 30, 45 25, 50 35 C 50 35, 55 45, 50 50" />
        {/* Middle */}
        <path d="M50 40 C 45 20, 55 15, 60 25 C 60 25, 65 40, 60 45" />
        {/* Ring */}
        <path d="M60 42 C 55 22, 65 17, 70 27 C 70 27, 75 42, 70 47" />
        {/* Pinky */}
        <path d="M70 48 C 68 35, 76 32, 80 40 C 80 40, 82 50, 75 55" />
        {/* Thumb folded over */}
        <path d="M30 65 C 20 50, 30 40, 40 45 C 50 50, 60 52, 60 52" />
        {/* Palm outline */}
        <path d="M35 70 C 25 55, 30 45, 30 45 M65 70 C 75 60, 80 50, 80 50" />
      </svg>
    );
  }

  if (gesture === 'PAPER') {
    return (
      <svg viewBox="0 0 100 100" className={baseClasses} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Wrist */}
        <path d="M40 90 L40 70 M60 90 L60 70" />
        <path d="M35 70 C 50 80, 65 70, 65 70" />
        {/* Thumb */}
        <path d="M30 60 C 15 55, 10 40, 20 35 C 30 30, 35 45, 35 45" />
        {/* Index */}
        <path d="M40 40 L 35 15 C 33 5, 43 5, 45 15 L 50 40" />
        {/* Middle */}
        <path d="M50 40 L 48 10 C 46 0, 56 0, 58 10 L 60 40" />
        {/* Ring */}
        <path d="M60 42 L 62 15 C 64 5, 74 5, 72 15 L 70 45" />
        {/* Pinky */}
        <path d="M70 48 L 75 25 C 77 15, 87 18, 83 28 L 78 52" />
        {/* Palm outline */}
        <path d="M35 70 C 25 60, 30 50, 30 50 M65 70 C 75 60, 80 50, 80 50" />
      </svg>
    );
  }

  if (gesture === 'SCISSORS') {
    return (
      <svg viewBox="0 0 100 100" className={baseClasses} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Wrist */}
        <path d="M40 90 L40 70 M60 90 L60 70" />
        <path d="M35 70 C 50 80, 65 70, 65 70" />
        {/* Thumb folded over */}
        <path d="M30 65 C 20 50, 30 40, 40 45 C 50 50, 55 52, 55 52" />
        {/* Index Extended */}
        <path d="M40 40 L 25 15 C 20 5, 30 0, 35 10 L 50 40" />
        {/* Middle Extended */}
        <path d="M50 40 L 55 10 C 58 0, 68 5, 62 15 L 60 40" />
        {/* Ring Folded */}
        <path d="M60 42 C 55 22, 65 17, 70 27 C 70 27, 75 42, 70 47" />
        {/* Pinky Folded */}
        <path d="M70 48 C 68 35, 76 32, 80 40 C 80 40, 82 50, 75 55" />
        {/* Palm outline */}
        <path d="M35 70 C 25 55, 30 45, 30 45 M65 70 C 75 60, 80 50, 80 50" />
      </svg>
    );
  }

  // Default / Other
  return (
    <svg viewBox="0 0 100 100" className={baseClasses} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="50" cy="50" r="40" strokeDasharray="5,5" />
      <path d="M50 30 L50 70 M30 50 L70 50" strokeDasharray="2,4" />
    </svg>
  );
}

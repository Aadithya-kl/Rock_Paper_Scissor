import type { GestureLabel } from '../db/db';
import type { TestTrial } from '../hooks/useEvaluation';

interface Props {
  trials: TestTrial[];
}

const CLASSES: (GestureLabel | 'NO HAND' | 'UNCERTAIN')[] = ['ROCK', 'PAPER', 'SCISSORS', 'OTHER', 'NO HAND', 'UNCERTAIN'];
const EXPECTED_CLASSES: GestureLabel[] = ['ROCK', 'PAPER', 'SCISSORS', 'OTHER'];

export function ConfusionMatrix({ trials }: Props) {
  const getCount = (expected: GestureLabel, predicted: GestureLabel | 'NO HAND' | 'UNCERTAIN') => {
    return trials.filter((t) => t.expected === expected && t.predicted === predicted).length;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs text-slate-400 uppercase bg-slate-800">
          <tr>
            <th scope="col" className="px-4 py-2">Expected \ Predicted</th>
            {CLASSES.map((c) => (
              <th key={c} scope="col" className="px-4 py-2 text-center">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EXPECTED_CLASSES.map((expected) => (
            <tr key={expected} className="border-b border-slate-700 bg-slate-900">
              <th scope="row" className="px-4 py-2 font-medium text-white whitespace-nowrap bg-slate-800">
                {expected}
              </th>
              {CLASSES.map((predicted) => {
                const count = getCount(expected, predicted);
                const isCorrect = expected === predicted;
                const bgColor = count > 0 ? (isCorrect ? 'bg-green-900/50' : 'bg-red-900/50') : '';
                return (
                  <td key={predicted} className={`px-4 py-2 text-center ${bgColor}`}>
                    {count}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

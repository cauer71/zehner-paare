import React from 'react';

interface NumberBankProps {
  numbers: number[];
  userInputs: { [key: string]: string };
}

const NumberBank: React.FC<NumberBankProps> = ({ numbers, userInputs }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, number: number) => {
    e.dataTransfer.setData("text/plain", number.toString());
  };
  
  // Diese Logik stellt sicher, dass doppelte Zahlen korrekt behandelt werden.
  // Z.B. wenn die Lösung zwei '5'en benötigt, wird nur eine '5' aus der Bank entfernt, wenn eine platziert wird.
  const getFrequencyMap = (arr: (string | number)[]) => 
    arr.reduce((acc: Record<string, number>, val) => {
      // FIX: Explicitly convert `val` to a string before using it as an object key.
      // TypeScript does not allow using a union type (`string | number`) as an indexer directly.
      const key = String(val);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const numbersInBankFreq = getFrequencyMap(numbers);
  const numbersOnBoardFreq = getFrequencyMap(Object.values(userInputs).map(val => parseInt(val, 10)));

  return (
    <div className="w-full max-w-sm mx-auto p-4 mt-4 bg-stone-200 rounded-2xl shadow-lg border-4 border-stone-300">
      <p className="text-center font-semibold text-slate-600 mb-3">Ziehe die Zahlen in die leeren Felder:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {Object.entries(numbersInBankFreq).map(([numStr, totalCount]) => {
          const num = parseInt(numStr, 10);
          const usedCount = numbersOnBoardFreq[num] || 0;
          const remainingCount = totalCount - usedCount;

          return Array.from({ length: remainingCount }).map((_, i) => (
             <div
              key={`${num}-${i}`}
              draggable
              onDragStart={(e) => handleDragStart(e, num)}
              className="w-12 h-12 flex items-center justify-center font-bold text-xl bg-white text-slate-800 rounded-full shadow-md border-2 border-gray-400 cursor-grab active:cursor-grabbing transition-transform duration-200 hover:scale-110"
            >
              {num}
            </div>
          ))
        })}
      </div>
    </div>
  );
};

export default NumberBank;

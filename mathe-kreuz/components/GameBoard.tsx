import React from 'react';
import { CellData, Difficulty } from '../types';

interface GameBoardProps {
  puzzle: CellData[][];
  userInputs: { [key:string]: string };
  onInputChange: (key: string, value: string) => void;
  onDrop: (key: string, value: string) => void;
  isGameWon: boolean;
  revealedCells: Set<string>;
  difficulty: Difficulty;
}

const GameBoard: React.FC<GameBoardProps> = ({ puzzle, userInputs, onInputChange, onDrop, isGameWon, revealedCells, difficulty }) => {

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Notwendig, um den Drop zu erlauben
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    if (userInputs[key] || isGameWon || revealedCells.has(key)) return; // Verhindert das Überschreiben
    const droppedValue = e.dataTransfer.getData("text/plain");
    onDrop(key, droppedValue);
  };

  const getCellClass = (cell: CellData) => {
    if (cell.value === null) return '';
    
    const is5x5 = puzzle[0]?.length === 5;

    // Base sizes
    const sizeClass5x5 = 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-xl sm:text-2xl md:text-3xl';
    const sizeClass11x9 = 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-base sm:text-lg md:text-xl';
    const operatorTextSize5x5 = 'text-2xl sm:text-3xl md:text-4xl';
    const operatorTextSize11x9 = 'text-lg sm:text-xl md:text-2xl';
    
    const sizeClass = is5x5 ? sizeClass5x5 : sizeClass11x9;
    
    let baseClass = `${sizeClass} flex items-center justify-center font-bold rounded-full transition-all duration-300`;
    
    if (cell.isInput) {
        baseClass += ' bg-white shadow-inner text-slate-800 border-2';
        if (revealedCells.has(cell.key)) {
            baseClass += ' border-violet-400 bg-violet-100 text-violet-800';
        }
        else if (cell.isCorrect === true) {
            baseClass += ' border-green-500 ring-4 ring-green-200';
        } else if (cell.isCorrect === false) {
            baseClass += ' border-red-500 ring-4 ring-red-200';
        } else {
            baseClass += ' border-gray-400 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-200';
        }
    } else if (typeof cell.value === 'number') {
        baseClass += ' bg-slate-700 text-white shadow-md border-2 border-slate-800';
    } else { // Operator or Equals sign
        const operatorTextSize = is5x5 ? operatorTextSize5x5 : operatorTextSize11x9;
        return `w-full h-full flex items-center justify-center ${operatorTextSize} font-bold text-slate-500`;
    }
    return baseClass;
  };

  const gridColsClass = puzzle[0]?.length === 5 ? 'grid-cols-5' : 'grid-cols-11';

  return (
    <div className="relative p-2 md:p-4 bg-stone-200 rounded-2xl shadow-lg border-4 border-stone-300">
        <div className={`grid ${gridColsClass} gap-1 sm:gap-1.5 items-center justify-items-center`}>
        {puzzle.flat().map((cell) => (
            <div key={cell.key} className={getCellClass(cell)}>
            {cell.value !== null && (
                cell.isInput ? (
                    difficulty === Difficulty.Easy ? (
                        <div 
                          className="w-full h-full"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, cell.key)}
                        >
                          <span className="w-full h-full flex items-center justify-center">
                            {userInputs[cell.key] || ''}
                          </span>
                        </div>
                    ) : (
                      <input
                        type="number"
                        value={userInputs[cell.key] || ''}
                        onChange={(e) => onInputChange(cell.key, e.target.value)}
                        className="w-full h-full text-center bg-transparent rounded-full focus:outline-none"
                        disabled={isGameWon || revealedCells.has(cell.key)}
                      />
                    )
                ) : (
                    <span>{cell.value}</span>
                )
            )}
            </div>
        ))}
        </div>
    </div>
  );
};

export default GameBoard;
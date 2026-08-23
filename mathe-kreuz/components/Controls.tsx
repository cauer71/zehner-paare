import React from 'react';
import { Difficulty } from '../types';

interface ControlsProps {
  currentDifficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onNewGame: () => void;
  onCheck: () => void;
  onHelp: () => void;
}

const Controls: React.FC<ControlsProps> = ({ currentDifficulty, onDifficultyChange, onNewGame, onCheck, onHelp }) => {
  const difficultyLevels = Object.values(Difficulty);

  const getDifficultyButtonClass = (level: Difficulty) => {
    const baseClass = "px-3 py-2 text-sm md:px-4 md:py-2 md:text-base rounded-md font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500";
    if (level === currentDifficulty) {
      return `${baseClass} bg-amber-500 text-white shadow-md`;
    }
    return `${baseClass} bg-white text-amber-700 hover:bg-amber-100 border border-amber-300`;
  };
  
  const actionButtonClass = "px-4 py-2 text-base rounded-md font-bold text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2";


  return (
    <div className="w-full max-w-lg mx-auto p-4 space-y-4">
      <div className="flex justify-center items-center space-x-2 md:space-x-4 bg-amber-100 p-2 rounded-lg">
        {difficultyLevels.map((level) => (
          <button
            key={level}
            onClick={() => onDifficultyChange(level)}
            className={getDifficultyButtonClass(level)}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex justify-center space-x-2 md:space-x-4">
        <button onClick={onNewGame} className={`${actionButtonClass} bg-sky-500 hover:bg-sky-600 focus:ring-sky-500`}>
          Neues Spiel
        </button>
        <button onClick={onHelp} className={`${actionButtonClass} bg-violet-500 hover:bg-violet-600 focus:ring-violet-500`}>
          Hilfe
        </button>
        <button onClick={onCheck} className={`${actionButtonClass} bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500`}>
          Prüfen
        </button>
      </div>
    </div>
  );
};

export default Controls;

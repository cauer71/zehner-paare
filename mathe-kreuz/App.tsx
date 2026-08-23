import React, { useState, useEffect, useCallback } from 'react';
import { Difficulty, CellData } from './types';
import { generatePuzzleWithSteps } from './services/puzzleGenerator';
import GameBoard from './components/GameBoard';
import Controls from './components/Controls';
import NumberBank from './components/NumberBank';

const gridDimensions: Record<Difficulty, { rows: number; cols: number }> = {
  [Difficulty.Easy]: { rows: 5, cols: 5 },
  [Difficulty.Medium]: { rows: 9, cols: 11 },
  [Difficulty.Hard]: { rows: 9, cols: 11 },
};

const shuffle = <T,>(array: T[]): T[] => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};


const App: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Easy);
  const [puzzle, setPuzzle] = useState<CellData[][]>([]);
  const [userInputs, setUserInputs] = useState<{ [key: string]: string }>({});
  const [isGameWon, setIsGameWon] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(true);
  const [numberBank, setNumberBank] = useState<number[]>([]);

  const startNewGame = useCallback(() => {
    setIsGenerating(true);
    setPuzzle([]);
    setUserInputs({});
    setIsGameWon(false);
    setRevealedCells(new Set());
    setNumberBank([]);
    
    // Run generation in a timeout to allow UI to update to "generating" state
    setTimeout(() => {
        try {
            const { puzzle: newPuzzle } = generatePuzzleWithSteps(difficulty);
            setPuzzle(newPuzzle);

            if (difficulty === Difficulty.Easy) {
                const numbers = newPuzzle.flat()
                    .filter(cell => cell.isInput)
                    .map(cell => cell.value as number);
                setNumberBank(shuffle(numbers));
            }

        } catch (e) {
            console.error("Fehler bei der Rätselgenerierung:", e);
            alert("Das Rätsel konnte nicht erstellt werden. Bitte versuchen Sie es erneut.");
        } finally {
            setIsGenerating(false);
        }
    }, 50);

  }, [difficulty]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const handleInputChange = (key: string, value: string) => {
    if (isGameWon || revealedCells.has(key)) return;
    setUserInputs((prev) => ({ ...prev, [key]: value }));
    
    setPuzzle(prevPuzzle => 
      prevPuzzle.map(row => 
        row.map(cell => 
          cell.key === key ? { ...cell, isCorrect: undefined } : cell
        )
      )
    );
  };

  const handleDrop = (key: string, value: string) => {
    // Drop logic is identical to input change
    handleInputChange(key, value);
  }
  
  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
  };

  const handleCheck = () => {
    if (isGameWon) return;

    let allCorrect = true;
    let allFilled = true;
    
    const newPuzzle = puzzle.map(row => 
      row.map(cell => {
        if (!cell.isInput) {
          return cell;
        }
        
        const userInput = userInputs[cell.key];
        const isAnswered = userInput !== undefined && userInput !== '';
        if(!isAnswered) {
          allFilled = false;
          return { ...cell, isCorrect: undefined };
        }

        const isCorrect = parseInt(userInput, 10) === cell.value;
        if (!isCorrect) {
          allCorrect = false;
        }
        return { ...cell, isCorrect };
      })
    );
    
    setPuzzle(newPuzzle);
    
    if (allFilled && allCorrect) {
        setIsGameWon(true);
    }
  };

  const handleHelp = () => {
    if (isGameWon) return;

    const unsolvedCells = puzzle.flat().filter(cell => 
        cell.isInput && 
        !revealedCells.has(cell.key) &&
        String(userInputs[cell.key] ?? '') !== String(cell.value)
    );

    if (unsolvedCells.length > 0) {
      const cellToReveal = unsolvedCells[Math.floor(Math.random() * unsolvedCells.length)];
      handleInputChange(cellToReveal.key, String(cellToReveal.value));
      setRevealedCells(prev => new Set(prev).add(cellToReveal.key));
    }
  };

  const { rows, cols } = gridDimensions[difficulty];
  const placeholderGridColsClass = cols === 5 ? 'grid-cols-5' : 'grid-cols-11';
  const placeholderCellSizeClass = cols === 5 
      ? 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16' 
      : 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
      <header className="text-center mb-6">
        <h1 className="text-4xl md:text-6xl font-extrabold text-amber-600 tracking-tight">Mathe-Kreuz</h1>
        <p className="text-lg md:text-xl text-slate-600 mt-2">Fülle die leeren Kreise aus, damit die Rechnungen stimmen!</p>
      </header>
      
      <main className="relative flex flex-col items-center">
        {isGenerating ? (
            <div className="p-2 md:p-4 bg-stone-200 rounded-2xl shadow-lg border-4 border-stone-300">
                <div className={`grid ${placeholderGridColsClass} gap-1 sm:gap-1.5 items-center justify-items-center opacity-0`}>
                 {/* Placeholder grid for sizing */}
                 {Array.from({ length: rows * cols }).map((_, i) => (
                    <div key={i} className={`${placeholderCellSizeClass} rounded-full bg-stone-300`} />
                ))}
                </div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xl font-semibold text-slate-600 animate-pulse">Generiere Rätsel...</p>
                </div>
            </div>
        ) : puzzle.length > 0 ? (
            <GameBoard 
              puzzle={puzzle} 
              userInputs={userInputs}
              onInputChange={handleInputChange}
              onDrop={handleDrop}
              isGameWon={isGameWon}
              revealedCells={revealedCells}
              difficulty={difficulty}
            />
        ) : null}

        {difficulty === Difficulty.Easy && !isGenerating && numberBank.length > 0 && !isGameWon && (
            <NumberBank numbers={numberBank} userInputs={userInputs} />
        )}
        
        <Controls 
          currentDifficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          onNewGame={startNewGame}
          onCheck={handleCheck}
          onHelp={handleHelp}
        />

        {isGameWon && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-2xl">
              <div className="text-center bg-white p-8 rounded-xl shadow-2xl transform scale-100 transition-transform duration-300">
                  <h2 className="text-4xl font-bold text-emerald-500 mb-4">Gut gemacht!</h2>
                  <p className="text-slate-700 mb-6">Du hast das Rätsel gelöst!</p>
                  <button onClick={startNewGame} className="px-6 py-3 bg-amber-500 text-white font-bold rounded-lg shadow-lg hover:bg-amber-600 transition-colors">
                    Nochmal spielen
                  </button>
              </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
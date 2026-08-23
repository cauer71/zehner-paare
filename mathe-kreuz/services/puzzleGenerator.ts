import { Difficulty, Operator, CellData, CellValue } from '../types';

export interface GenerationStep {
    grid: CellValue[][];
    message: string;
    highlightedCells?: { r: number, c: number }[];
}

// Define layouts for different grid sizes
const horizontalEquations5x5 = [
    { r: 0, c: 0 }, { r: 2, c: 0 }, { r: 4, c: 0 },
];
const verticalEquations5x5 = [
    { r: 0, c: 0 }, { r: 0, c: 2 }, { r: 0, c: 4 },
];
const allEquationSlots5x5 = [
    ...horizontalEquations5x5.map(pos => ({ ...pos, dir: 'h' as const })),
    ...verticalEquations5x5.map(pos => ({ ...pos, dir: 'v' as const })),
];

const horizontalEquations11x9 = [
    { r: 0, c: 2 }, { r: 0, c: 6 },
    { r: 2, c: 0 }, { r: 2, c: 6 },
    { r: 4, c: 2 },
    { r: 6, c: 0 }, { r: 6, c: 6 },
    { r: 8, c: 2 },
];
const verticalEquations11x9 = [
    { r: 0, c: 0 }, { r: 0, c: 2 }, { r: 0, c: 6 }, { r: 0, c: 10 },
    { r: 2, c: 4 }, { r: 2, c: 8 },
    { r: 4, c: 2 }, { r: 4, c: 6 }, { r: 4, c: 10 },
];
const allEquationSlots11x9 = [
    ...horizontalEquations11x9.map(pos => ({ ...pos, dir: 'h' as const })),
    ...verticalEquations11x9.map(pos => ({ ...pos, dir: 'v' as const })),
];


const difficultySettings: Record<Difficulty, {
  operators: Operator[];
  numberRange: [number, number];
  maxResult: number;
  rows: number;
  cols: number;
  horizontalEquations: { r: number; c: number }[];
  verticalEquations: { r: number; c: number }[];
  allEquationSlots: { r: number; c: number; dir: 'h' | 'v' }[];
}> = {
  [Difficulty.Easy]: {
    operators: ['+', '-'],
    numberRange: [1, 10],
    maxResult: 20,
    rows: 5,
    cols: 5,
    horizontalEquations: horizontalEquations5x5,
    verticalEquations: verticalEquations5x5,
    allEquationSlots: allEquationSlots5x5,
  },
  [Difficulty.Medium]: {
    operators: ['+', '-', '×'],
    numberRange: [1, 30],
    maxResult: 200,
    rows: 9,
    cols: 11,
    horizontalEquations: horizontalEquations11x9,
    verticalEquations: verticalEquations11x9,
    allEquationSlots: allEquationSlots11x9,
  },
  [Difficulty.Hard]: {
    operators: ['+', '-', '×', '÷'],
    numberRange: [2, 50],
    maxResult: 300,
    rows: 9,
    cols: 11,
    horizontalEquations: horizontalEquations11x9,
    verticalEquations: verticalEquations11x9,
    allEquationSlots: allEquationSlots11x9,
  },
};

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

const performOperation = (a: number, op: Operator, b: number): number => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return a / b;
  }
};

const cloneGrid = (grid: CellValue[][]): CellValue[][] => grid.map(row => [...row]);


const tryGeneratePuzzle = (settings: typeof difficultySettings[Difficulty], steps: GenerationStep[]): CellValue[][] | null => {
    const { operators, numberRange, maxResult, rows, cols, allEquationSlots } = settings;

    const isValidResult = (result: number): boolean => {
        return Number.isInteger(result) && result >= 0 && result <= maxResult;
    };
    
    const addStep = (message: string, grid: CellValue[][], highlightedCells?: { r: number, c: number }[]) => {
        steps.push({ grid: cloneGrid(grid), message, highlightedCells });
    };

    for (let attempt = 0; attempt < 500; attempt++) {
        const grid: CellValue[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
        let success = true;
        const shuffledSlots = shuffle([...allEquationSlots]);

        for (const slot of shuffledSlots) {
            let equationGenerated = false;
            // Try to generate a valid equation for this slot
            for (let i = 0; i < 200; i++) {
                // Get constraints from the grid
                let n1Constraint: number | null = null;
                let n2Constraint: number | null = null;
                let resConstraint: number | null = null;

                if (slot.dir === 'h') {
                    n1Constraint = typeof grid[slot.r][slot.c] === 'number' ? grid[slot.r][slot.c] as number : null;
                    n2Constraint = typeof grid[slot.r][slot.c + 2] === 'number' ? grid[slot.r][slot.c + 2] as number : null;
                    resConstraint = typeof grid[slot.r][slot.c + 4] === 'number' ? grid[slot.r][slot.c + 4] as number : null;
                } else { // 'v'
                    n1Constraint = typeof grid[slot.r][slot.c] === 'number' ? grid[slot.r][slot.c] as number : null;
                    n2Constraint = typeof grid[slot.r + 2][slot.c] === 'number' ? grid[slot.r + 2][slot.c] as number : null;
                    resConstraint = typeof grid[slot.r + 4][slot.c] === 'number' ? grid[slot.r + 4][slot.c] as number : null;
                }

                const n1 = n1Constraint ?? getRandomInt(numberRange[0], numberRange[1]);
                const n2 = n2Constraint ?? getRandomInt(numberRange[0], numberRange[1]);
                const op = shuffle([...operators])[0];
                
                if (op === '÷' && (n2 === 0 || n1 % n2 !== 0)) continue;

                const result = performOperation(n1, op, n2);

                if (!isValidResult(result)) continue;
                if (resConstraint !== null && result !== resConstraint) continue;
                
                // If both numbers were constrained, the operator must produce a valid result
                if (n1Constraint !== null && n2Constraint !== null) {
                    const checkResult = performOperation(n1Constraint, op, n2Constraint);
                    if (result !== checkResult) continue;
                }

                // Equation is valid and fits constraints. Place it on the grid.
                if (slot.dir === 'h') {
                    grid[slot.r][slot.c] = n1;
                    grid[slot.r][slot.c + 1] = op;
                    grid[slot.r][slot.c + 2] = n2;
                    grid[slot.r][slot.c + 3] = '=';
                    grid[slot.r][slot.c + 4] = result;
                } else { // 'v'
                    grid[slot.r][slot.c] = n1;
                    grid[slot.r + 1][slot.c] = op;
                    grid[slot.r + 2][slot.c] = n2;
                    grid[slot.r + 3][slot.c] = '=';
                    grid[slot.r + 4][slot.c] = result;
                }
                equationGenerated = true;
                break;
            }

            if (!equationGenerated) {
                success = false;
                break;
            }
        }

        if (success) {
            addStep("Gültiges Raster gefunden!", grid);
            return grid;
        }
    }

    addStep("Konnte kein perfektes Raster finden. Starte neu...", Array(rows).fill(null).map(() => Array(cols).fill(null)));
    return null; // Failure
};

export const generatePuzzleWithSteps = (difficulty: Difficulty): { puzzle: CellData[][], solution: CellValue[][], steps: GenerationStep[] } => {
  const settings = difficultySettings[difficulty];
  const { rows, cols, horizontalEquations, verticalEquations } = settings;

  let solution: CellValue[][] | null = null;
  let allSteps: GenerationStep[] = [];
  let attempt = 1;

  while(!solution) {
      let currentSteps: GenerationStep[] = [];
      currentSteps.push({grid: Array(rows).fill(null).map(() => Array(cols).fill(null)), message: `Suche nach einer gültigen Lösung... Versuch #${attempt}`});
      solution = tryGeneratePuzzle(settings, currentSteps);
      allSteps.push(...currentSteps);
      attempt++;
      if (attempt > 5) { 
          throw new Error("Konnte kein Rätsel generieren. Bitte lade die Seite neu oder wähle einen einfacheren Schwierigkeitsgrad.");
      }
  }

  const finalSolution = solution;
  const puzzle: CellData[][] = finalSolution.map((row, r) =>
    row.map((cell, c) => ({
      value: cell,
      isInput: false,
      key: `${r}-${c}`,
    }))
  );
  
  // Make exactly one hole per equation.
  const holeCoords = new Set<string>();

  // Process horizontal equations
  for (const eq of horizontalEquations) {
    const { r, c } = eq;
    const numberPositions = [
      { r, c },       // num1
      { r, c: c + 2 }, // num2
      { r, c: c + 4 }  // result
    ];
    // Randomly pick one of the three numbers to be the hole
    const holePosition = numberPositions[Math.floor(Math.random() * numberPositions.length)];
    holeCoords.add(`${holePosition.r}-${holePosition.c}`);
  }

  // Process vertical equations
  for (const eq of verticalEquations) {
    const { r, c } = eq;
    const numberPositions = [
      { r, c },       // num1
      { r: r + 2, c }, // num2
      { r: r + 4, c }  // result
    ];
    // Randomly pick one of the three numbers to be the hole
    const holePosition = numberPositions[Math.floor(Math.random() * numberPositions.length)];
    holeCoords.add(`${holePosition.r}-${holePosition.c}`);
  }
  
  // Apply the holes to the puzzle grid
  holeCoords.forEach(key => {
      const [r, c] = key.split('-').map(Number);
      if (puzzle[r] && puzzle[r][c]) {
          puzzle[r][c].isInput = true;
      }
  });

  return { puzzle, solution: finalSolution, steps: allSteps };
};


export enum Difficulty {
  Easy = 'Leicht',
  Medium = 'Mittel',
  Hard = 'Schwer',
}

export type Operator = '+' | '-' | '×' | '÷';

export type CellValue = number | Operator | '=' | null;

export interface CellData {
  value: CellValue;
  isInput: boolean;
  isCorrect?: boolean;
  key: string;
}

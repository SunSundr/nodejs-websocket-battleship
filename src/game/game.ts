import { CELLTYPE } from './types';

type CellState = number;

export class Game {
  private readonly board: CellState[][] = Array.from({ length: 10 }, () =>
    Array(10).fill(CELLTYPE.EMPTY)
  );

  constructor(public port: number) {}
}

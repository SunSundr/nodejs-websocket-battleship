import { CELLTYPE } from './types';
import { uuid4 } from '../utils/uuid';

type CellState = number;

export class Game {
  readonly id: string;
  private readonly board: CellState[][] = Array.from({ length: 10 }, () =>
    Array(10).fill(CELLTYPE.EMPTY)
  );

  constructor() {
    this.id = uuid4();
  }
}

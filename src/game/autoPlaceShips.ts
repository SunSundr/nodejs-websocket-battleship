import { CELLTYPE, CellState } from './types';
import { BOARDSIZE } from '../config';

function isValidPlacement(
  board: CellState[][],
  x: number,
  y: number,
  length: number,
  vertical: boolean
): boolean {
  if (vertical && x + length > BOARDSIZE) return false;
  if (!vertical && y + length > BOARDSIZE) return false;

  for (let i = 0; i < length; i++) {
    const posX = vertical ? x + i : x;
    const posY = vertical ? y : y + i;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const checkX = posX + dx;
        const checkY = posY + dy;
        if (checkX >= 0 && checkX < BOARDSIZE && checkY >= 0 && checkY < BOARDSIZE) {
          if (board[checkX][checkY] !== CELLTYPE.EMPTY) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

function placeShip(
  board: CellState[][],
  x: number,
  y: number,
  length: number,
  vertical: boolean
): void {
  for (let i = 0; i < length; i++) {
    const posX = vertical ? x + i : x;
    const posY = vertical ? y : y + i;
    board[posX][posY] = CELLTYPE.SHIP;
  }
}

export function autoPlaceShips(board: CellState[][]): CellState[][] {
  const ships = [
    { length: 4, count: 1 },
    { length: 3, count: 2 },
    { length: 2, count: 3 },
    { length: 1, count: 4 },
  ];

  for (const ship of ships) {
    for (let i = 0; i < ship.count; i++) {
      let placed = false;
      while (!placed) {
        const x = Math.floor(Math.random() * BOARDSIZE);
        const y = Math.floor(Math.random() * BOARDSIZE);
        const vertical = Math.random() < 0.5;

        if (isValidPlacement(board, x, y, ship.length, vertical)) {
          placeShip(board, x, y, ship.length, vertical);
          placed = true;
        }
      }
    }
  }

  return board;
}

import { CELLTYPE, ClientShips } from './types';
import { CellState, BOARDSIZE } from './gameBoard';
import { getShipType } from './shipType';

export function retrieveShips(board: CellState[][]): ClientShips[] {
  const ships: ClientShips[] = [];
  const visited = Array.from({ length: BOARDSIZE }, () => Array(BOARDSIZE).fill(false));
  const isCellShip = (cell: number) => cell === CELLTYPE.SHIP || cell === CELLTYPE.SHIP_HIT;

  for (let y = 0; y < BOARDSIZE; y++) {
    for (let x = 0; x < BOARDSIZE; x++) {
      if (isCellShip(board[y][x]) && !visited[y][x]) {
        let length = 1;
        let direction = true;

        if (x + 1 < BOARDSIZE && isCellShip(board[y][x + 1])) {
          direction = false;
          while (x + length < BOARDSIZE && isCellShip(board[y][x + length])) {
            visited[y][x + length] = true;
            length++;
          }
        } else if (y + 1 < BOARDSIZE && isCellShip(board[y + 1][x])) {
          direction = true;
          while (y + length < BOARDSIZE && isCellShip(board[y + length][x])) {
            visited[y + length][x] = true;
            length++;
          }
        }

        ships.push({ position: { x, y }, direction, type: getShipType(length), length });
        visited[y][x] = true;
      }
    }
  }

  return ships;
}

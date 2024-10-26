import { CELLTYPE, ClientShips, ShipType } from './types';
import { User } from '../user/user';
import { Room } from './room';

type CellState = number;
const BOARDSIZE = 10;

export class GameBoard {
  ships: ClientShips[] = [];
  readyState = false;
  private readonly board: CellState[][] = Array.from({ length: BOARDSIZE }, () =>
    Array(BOARDSIZE).fill(CELLTYPE.EMPTY)
  );

  constructor(private readonly user: User) {}

  addShips(ships: ClientShips[], room: Room): void {
    this.ships = ships;
    this.readyState = true;
    ships.forEach((ship) => {
      const { x, y } = ship.position;
      const { length, direction } = ship;
      for (let i = 0; i < length; i++) {
        const posX = direction ? x : x + i;
        const posY = direction ? y + i : y;

        if (posX >= 0 && posX < BOARDSIZE && posY >= 0 && posY < BOARDSIZE) {
          this.board[posY][posX] = CELLTYPE.SHIP;
        }
      }
    });
    room.setNextTurn(this.user);
  }

  private isShipKilled(_x: number, _y: number): boolean {
    return false;
  }

  private markSurroundingsAsHit(_x: number, _y: number): void {
    // nothing
  }

  attack(position: { x: number; y: number }): string {
    const { x, y } = position;
    if (this.board[y][x] === CELLTYPE.EMPTY) {
      this.board[y][x] = CELLTYPE.HIT;

      return 'miss';
    }

    if (this.board[y][x] === CELLTYPE.SHIP) {
      this.board[y][x] = CELLTYPE.SHIP_HIT;
      const isKilled = this.isShipKilled(x, y);
      if (isKilled) {
        this.markSurroundingsAsHit(x, y);

        return 'killed';
      }

      return 'shot';
    }

    return 'miss';
  }

  retrieveShips(): ClientShips[] {
    const ships: ClientShips[] = [];
    const visited = Array.from({ length: BOARDSIZE }, () => Array(BOARDSIZE).fill(false));

    for (let y = 0; y < BOARDSIZE; y++) {
      for (let x = 0; x < BOARDSIZE; x++) {
        if (this.board[y][x] === CELLTYPE.SHIP && !visited[y][x]) {
          let length = 1;
          let direction = true;

          if (x + 1 < BOARDSIZE && this.board[y][x + 1] === CELLTYPE.SHIP) {
            direction = false;
            while (x + length < BOARDSIZE && this.board[y][x + length] === CELLTYPE.SHIP) {
              visited[y][x + length] = true;
              length++;
            }
          } else if (y + 1 < BOARDSIZE && this.board[y + 1][x] === CELLTYPE.SHIP) {
            direction = true;
            while (y + length < BOARDSIZE && this.board[y + length][x] === CELLTYPE.SHIP) {
              visited[y + length][x] = true;
              length++;
            }
          }

          ships.push({ position: { x, y }, direction, type: this.getShipType(length), length });
          visited[y][x] = true;
        }
      }
    }

    return ships;
  }

  getShipType(length: number): ShipType {
    switch (length) {
      case 1:
        return ShipType.small;
      case 2:
        return ShipType.medium;
      case 3:
        return ShipType.large;
      case 4:
        return ShipType.huge;
      default:
        return ShipType.unknown;
    }
  }
}

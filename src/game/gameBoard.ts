import { CELLTYPE, ClientShips, ShipType, Point, HitType, AttackResult } from './types';
import { type User } from '../user/user';
import { type Room } from './room';

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

  private isShipKilledCells(x: number, y: number): { Killed: boolean; shipCells: Point[] } {
    const shipCells = this.getShipCells(x, y);
    const Killed = shipCells.every((cell) => this.board[cell.y][cell.x] === CELLTYPE.SHIP_HIT);

    return { Killed, shipCells };
  }

  private getShipCells(x: number, y: number): Point[] {
    const shipCells: Point[] = [{ x, y }];
    const directions = [
      { dx: 1, dy: 0 }, // right
      { dx: -1, dy: 0 }, // left
      { dx: 0, dy: 1 }, // down
      { dx: 0, dy: -1 }, // up
    ];

    for (const { dx, dy } of directions) {
      let posX = x + dx;
      let posY = y + dy;

      while (
        posX >= 0 &&
        posX < BOARDSIZE &&
        posY >= 0 &&
        posY < BOARDSIZE &&
        (this.board[posY][posX] === CELLTYPE.SHIP || this.board[posY][posX] === CELLTYPE.SHIP_HIT)
      ) {
        shipCells.push({ x: posX, y: posY });
        posX += dx;
        posY += dy;
      }
    }

    return shipCells;
  }

  private markSurroundingsAsHit(x: number, y: number, all = true): Point[] {
    const affectedCells: Point[] = [];
    const shipCells = this.getShipCells(x, y);
    const directions = [
      { dx: -1, dy: -1 }, // top left
      { dx: 0, dy: -1 }, // top
      { dx: 1, dy: -1 }, // top right
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: 0 }, // right
      { dx: -1, dy: 1 }, // bottom left
      { dx: 0, dy: 1 }, // bottom
      { dx: 1, dy: 1 }, // bottom right
    ];

    for (const cell of shipCells) {
      for (const { dx, dy } of directions) {
        const posX = cell.x + dx;
        const posY = cell.y + dy;

        if (
          posX >= 0 &&
          posX < BOARDSIZE &&
          posY >= 0 &&
          posY < BOARDSIZE &&
          (this.board[posY][posX] === CELLTYPE.EMPTY ||
            (all && this.board[posY][posX] === CELLTYPE.HIT))
        ) {
          this.board[posY][posX] = CELLTYPE.HIT;
          affectedCells.push({ x: posX, y: posY });
        }
      }
    }

    return affectedCells;
  }

  randomAttack(_x?: number, _y?: number): void {}

  attack(x: number, y: number): AttackResult {
    if (this.board[y][x] === CELLTYPE.HIT || this.board[y][x] === CELLTYPE.SHIP_HIT) {
      return { status: HitType.repeat };
    }

    if (this.board[y][x] === CELLTYPE.EMPTY) {
      this.board[y][x] = CELLTYPE.HIT;

      return { status: HitType.miss };
    }

    if (this.board[y][x] === CELLTYPE.SHIP) {
      this.board[y][x] = CELLTYPE.SHIP_HIT;

      const shipCells = this.isShipKilledCells(x, y);
      if (shipCells.Killed) {
        const aroundCells = this.markSurroundingsAsHit(x, y);

        return { status: HitType.killed, aroundCells, shipCells: shipCells.shipCells };
      }

      return { status: HitType.shot, aroundCells: [] };
    }

    return { status: HitType.miss };
  }

  retrieveShips(): ClientShips[] {
    const ships: ClientShips[] = [];
    const visited = Array.from({ length: BOARDSIZE }, () => Array(BOARDSIZE).fill(false));
    const isCellShip = (cell: number) => cell === CELLTYPE.SHIP || cell === CELLTYPE.SHIP_HIT;

    for (let y = 0; y < BOARDSIZE; y++) {
      for (let x = 0; x < BOARDSIZE; x++) {
        if (isCellShip(this.board[y][x]) && !visited[y][x]) {
          let length = 1;
          let direction = true;

          if (x + 1 < BOARDSIZE && isCellShip(this.board[y][x + 1])) {
            direction = false;
            while (x + length < BOARDSIZE && isCellShip(this.board[y][x + length])) {
              visited[y][x + length] = true;
              length++;
            }
          } else if (y + 1 < BOARDSIZE && isCellShip(this.board[y + 1][x])) {
            direction = true;
            while (y + length < BOARDSIZE && isCellShip(this.board[y + length][x])) {
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

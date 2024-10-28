import { CELLTYPE, ClientShips, Point, HitType, AttackResult, CellState } from './types';
import { retrieveShips } from './retrieveShips';
import { autoPlaceShips } from './autoPlaceShips';
import { type User } from '../user/user';
import { type Room } from './room';
import { BOARDSIZE } from '../config';

export function generateEmptyBoard(): CellState[][] {
  return Array.from({ length: BOARDSIZE }, () => Array(BOARDSIZE).fill(CELLTYPE.EMPTY));
}

export class GameBoard {
  ships: ClientShips[] = [];
  readyState = false;
  private unsunksCount = 0;
  private lastShotPoint?: Point;
  private readonly board: CellState[][] = generateEmptyBoard();

  constructor(private readonly user?: User) {}

  addShips(ships: ClientShips[], room: Room): void {
    this.ships = ships;
    this.readyState = true;
    this.unsunksCount = ships.length;
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
    if (this.user) room.setNextTurn(this.user);
  }

  finish(): boolean {
    return this.readyState && this.unsunksCount === 0;
  }

  private isShipKilledCells(x: number, y: number): { Killed: boolean; cells: Point[] } {
    const cells = this.getShipCells(x, y);
    const Killed = cells.every((cell) => this.board[cell.y][cell.x] === CELLTYPE.SHIP_HIT);

    return { Killed, cells };
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

  randomAttackPoint(): Point {
    const directions = [
      // { dx: -1, dy: -1 }, // top left
      { dx: 0, dy: -1 }, // top
      // { dx: 1, dy: -1 }, // top right
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: 0 }, // right
      // { dx: -1, dy: 1 }, // bottom left
      { dx: 0, dy: 1 }, // bottom
      // { dx: 1, dy: 1 }, // bottom right
    ];

    let targetCell: Point | undefined;
    if (this.lastShotPoint) {
      const { x, y } = this.lastShotPoint;
      const surroundingCells = directions
        .map(({ dx, dy }) => ({ x: x + dx, y: y + dy }))
        .filter(
          (cell) =>
            cell.x >= 0 &&
            cell.x < BOARDSIZE &&
            cell.y >= 0 &&
            cell.y < BOARDSIZE &&
            this.board[cell.y][cell.x] !== CELLTYPE.HIT &&
            this.board[cell.y][cell.x] !== CELLTYPE.SHIP_HIT
        );
      if (surroundingCells.length > 0)
        targetCell = surroundingCells[Math.floor(Math.random() * surroundingCells.length)];
    }

    if (!targetCell) {
      const emptyCells = [];
      for (let i = 0; i < BOARDSIZE; i++) {
        for (let j = 0; j < BOARDSIZE; j++) {
          if (this.board[i][j] !== CELLTYPE.HIT && this.board[i][j] !== CELLTYPE.SHIP_HIT) {
            emptyCells.push({ x: j, y: i });
          }
        }
      }

      targetCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      if (!targetCell) targetCell = { x: 0, y: 0 };
    }

    return targetCell;
  }

  randomAttack(): AttackResult {
    const point = this.randomAttackPoint();

    return this.attack(point.x, point.y);
  }

  attack(x: number, y: number): AttackResult {
    const point = { x, y };
    if (this.board[y][x] === CELLTYPE.HIT || this.board[y][x] === CELLTYPE.SHIP_HIT) {
      return { point, status: HitType.repeat };
    }

    if (this.board[y][x] === CELLTYPE.EMPTY) {
      this.board[y][x] = CELLTYPE.HIT;

      return { point, status: HitType.miss };
    }

    if (this.board[y][x] === CELLTYPE.SHIP) {
      this.board[y][x] = CELLTYPE.SHIP_HIT;

      const shipCells = this.isShipKilledCells(x, y);
      if (shipCells.Killed) {
        this.unsunksCount -= 1;
        this.lastShotPoint = undefined;
        const aroundCells = this.markSurroundingsAsHit(x, y);

        return {
          point,
          status: HitType.killed,
          aroundCells,
          shipCells: shipCells.cells,
          finish: this.finish(),
        };
      }

      this.lastShotPoint = { x, y };

      return { point, status: HitType.shot, aroundCells: [] };
    }

    return { point, status: HitType.miss };
  }

  autoPlaceShips(): void {
    if (this.readyState) return;
    autoPlaceShips(this.board);
    this.readyState = true;
  }

  retrieveShips(): ClientShips[] {
    return retrieveShips(this.board);
  }
}

import { CELLTYPE, ClientShips, Point, HitType, AttackResult, CellState } from './types';
import { getRandomElement } from '../utils/array';
import { retrieveShips } from './retrieveShips';
import { autoPlaceShips } from './autoPlaceShips';
import { type User } from '../user/user';
import { type Room } from './room';
import { BOARDSIZE } from '../config';

interface Direction {
  dx: number;
  dy: number;
}

interface RandomPoint {
  cell: Point;
  countEmpty: number;
}

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

  private getDirections(): Direction[] {
    return [
      { dx: 1, dy: 0 }, // right
      { dx: -1, dy: 0 }, // left
      { dx: 0, dy: 1 }, // down
      { dx: 0, dy: -1 }, // up
    ];
  }

  private getDirectionsAll(): Direction[] {
    return [
      { dx: -1, dy: -1 }, // top left
      { dx: 1, dy: -1 }, // top right
      { dx: -1, dy: 1 }, // bottom left
      { dx: 1, dy: 1 }, // bottom right
      ...this.getDirections(),
    ];
  }

  private isShipKilledCells(x: number, y: number): { Killed: boolean; cells: Point[] } {
    const cells = this.getShipCells(x, y);
    const Killed = cells.every((cell) => this.board[cell.y][cell.x] === CELLTYPE.SHIP_HIT);

    return { Killed, cells };
  }

  private getShipCells(x: number, y: number): Point[] {
    const shipCells: Point[] = [{ x, y }];
    const directions = this.getDirections();

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
    const directions = this.getDirectionsAll();

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

  setState(x: number, y: number, hitType: HitType): void {
    switch (hitType) {
      case HitType.miss:
        this.board[y][x] = CELLTYPE.HIT;
        break;
      case HitType.shot:
      case HitType.killed:
        this.board[y][x] = CELLTYPE.SHIP_HIT;
        break;
      default:
    }
  }

  findClosestPoint(shotPoint: Point, direction: boolean | null): Point | undefined {
    const directions: Direction[] = [];
    // false - horizontal; true - vertical; null - unknown
    switch (direction) {
      case false:
        directions.push({ dx: -1, dy: 0 }, { dx: 1, dy: 0 }); // left, right
        break;
      case true:
        directions.push({ dx: 0, dy: -1 }, { dx: 0, dy: 1 }); // top, bottom
        break;

      default:
        directions.push({ dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 });
    }

    let targetCell: Point | undefined;

    const { x, y } = shotPoint;
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

    return targetCell;
  }

  private getEmptyCells(): Point[] {
    const emptyCells: Point[] = [];
    for (let i = 0; i < BOARDSIZE; i++) {
      for (let j = 0; j < BOARDSIZE; j++) {
        if (this.board[i][j] !== CELLTYPE.HIT && this.board[i][j] !== CELLTYPE.SHIP_HIT) {
          emptyCells.push({ x: j, y: i });
        }
      }
    }

    return emptyCells;
  }

  randomAttackPoint(): Point {
    const emptyCells = this.getEmptyCells();
    if (!emptyCells.length) return { x: 0, y: 0 }; // never

    return getRandomElement(emptyCells);
  }

  randomAttackPointBot(): Point {
    const emptyCells = this.getEmptyCells();
    if (!emptyCells.length) return { x: 0, y: 0 }; // never

    // return getRandomElement(emptyCells);

    const directions = this.getDirectionsAll();
    const randomPoints: RandomPoint[] = [];

    for (const cell of emptyCells) {
      let countEmpty = 0;
      for (const { dx, dy } of directions) {
        const posX = cell.x + dx;
        const posY = cell.y + dy;

        if (
          posX >= 0 &&
          posX < BOARDSIZE &&
          posY >= 0 &&
          posY < BOARDSIZE &&
          this.board[posY][posX] === CELLTYPE.EMPTY
        ) {
          countEmpty++;
        }
      }

      if (countEmpty > 0) {
        if (cell.x === 0 || cell.x === BOARDSIZE - 1) countEmpty++;
        if (cell.y === 0 || cell.y === BOARDSIZE - 1) countEmpty++;
      }

      randomPoints.push({ cell, countEmpty });
    }

    const cellCounts = [8, 7, 6, 5, 4, 3, 2, 1];
    for (const count of cellCounts) {
      const filteredCells = randomPoints.filter((cell) => cell.countEmpty === count);
      if (filteredCells.length) {
        return getRandomElement<RandomPoint>(filteredCells).cell;
      }
    }

    return getRandomElement(emptyCells);
  }

  randomAttack(): AttackResult {
    const point = this.randomAttackPoint();

    return this.attack(point.x, point.y);
  }

  attack(x: number, y: number): AttackResult {
    const point = { x, y };

    if (this.board[y][x] === CELLTYPE.HIT) {
      return { point, status: HitType.repeat, repeatStatus: HitType.miss };
    }

    if (this.board[y][x] === CELLTYPE.SHIP_HIT) {
      const shipCells = this.isShipKilledCells(x, y);

      return {
        point,
        status: HitType.repeat,
        repeatStatus: shipCells.Killed ? HitType.killed : HitType.shot,
      };
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

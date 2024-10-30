export enum CELLTYPE {
  EMPTY = 0b000,
  SHIP = 0b001,
  HIT = 0b010,
  SHIP_HIT = 0b011,
}

export enum ShipType {
  small = 'small',
  medium = 'medium',
  large = 'large',
  huge = 'huge',
  unknown = 'unknown',
}

export enum HitType {
  miss = 'miss',
  shot = 'shot',
  killed = 'killed',
  repeat = 'repeat',
}

export type CellState = number;

export interface RoomUsers {
  name: string;
  index: number | string;
}

export interface RoomData {
  roomId: number | string;
  roomUsers: RoomUsers[];
}

export interface RoomIndex {
  indexRoom: number | string;
}

export interface GameData {
  idGame: number | string;
  idPlayer: number | string;
}

export type Point = {
  x: number;
  y: number;
};

export interface ClientShips {
  position: Point;
  direction: boolean;
  type: ShipType;
  length: number;
}

export interface ShipsData {
  gameId: string;
  ships: ClientShips[];
  indexPlayer: string;
}

export interface StartShipsData {
  ships: ClientShips[];
  currentPlayerIndex: string;
}

export interface AttackResult {
  point: Point;
  status: HitType;
  repeatStatus?: HitType;
  aroundCells?: Point[];
  shipCells?: Point[];
  finish?: boolean;
}

export interface AttackFeedback {
  position: Point;
  currentPlayer: number | string;
  status: HitType;
  repeatStatus?: HitType;
}

export interface AttackData {
  gameId: number | string;
  x?: number;
  y?: number;
  indexPlayer: number | string;
}

export interface FinishData {
  winPlayer: number | string;
}

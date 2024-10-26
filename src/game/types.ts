export enum CELLTYPE {
  EMPTY = 0b000,
  SHIP = 0b001,
  HIT = 0b010,
  SHIP_HIT = 0b011,
}

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

export enum ShipType {
  small = 'small',
  medium = 'medium',
  large = 'large',
  huge = 'huge',
  unknown = 'unknown',
}

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

export interface FinishData {
  winPlayer: number | string;
}

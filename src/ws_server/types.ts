import {
  RoomData,
  RoomIndex,
  GameData,
  ShipsData,
  StartShipsData,
  FinishData,
  AttackFeedback,
  AttackData,
} from '../game/types';

export enum MSG_TYPES {
  registration = 'reg',
  updateWinners = 'update_winners',
  createRoom = 'create_room',
  addUserToRoom = 'add_user_to_room',
  createGame = 'create_game',
  updateRoom = 'update_room',
  addShips = 'add_ships',
  startGame = 'start_game',
  attack = 'attack',
  randomAttack = 'randomAttack',
  turn = 'turn',
  finish = 'finish',
  diconnect = 'diconnect',
  bot = 'single_play',
  error = 'server_error',
  info = 'server_info',
}

export interface RegData {
  name: string;
  password?: string;
  error?: boolean;
  errorText?: string;
  index: number | string;
}

export interface WinnersData {
  name: string;
  wins: number;
}

export interface TurnData {
  currentPlayer: number | string;
}

export interface WsMessage {
  type: MSG_TYPES;
  data:
    | RegData
    | WinnersData[]
    | RoomData[]
    | RoomIndex
    | GameData
    | ShipsData
    | StartShipsData
    | TurnData
    | FinishData
    | AttackFeedback
    | AttackData
    | string;
  readonly id: number;
}

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

export interface RoomData {
  indexRoom: number | string;
}

export interface GameData {
  idGame: number | string;
  idPlayer: number | string;
}

export interface WsMessage {
  type: MSG_TYPES;
  data: RegData | WinnersData[] | string;
  id: number;
}
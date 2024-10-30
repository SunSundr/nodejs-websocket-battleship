import { WebSocket } from 'ws';
import { User } from '../user/user';
import { uuid4 } from '../utils/uuid';
import { removeFromArray } from '../utils/array';
import { RoomUsers } from './types';

export class Room {
  private turnStatus = false;
  private readonly players: [User?, User?] = [];
  readonly id: string;
  private gameIds?: string;
  winner?: User;
  botConnection?: WebSocket;
  timeStamp?: number;

  constructor() {
    this.id = uuid4();
  }

  static create(user: User | undefined, rooms: Map<string | number, Room>): Room {
    const room = new Room();
    if (user) {
      room.addPlayer(user);
      user.rooms.add(room);
    }

    rooms.set(room.id, room);

    return room;
  }

  static findRoomByGameId(
    gameId: string | number,
    rooms: Map<string | number, Room>
  ): Room | undefined {
    for (const room of Array.from(rooms.values())) {
      if (room.gameIds === gameId) return room;
    }

    return undefined;
  }

  isBotRoom(): boolean {
    return !!this.botConnection;
  }

  statistic(): { userWinner?: User; userLoser?: User } {
    const userWinner = this.winner;
    if (!userWinner) return {};
    const userLoser = this.anotherPlayer(userWinner);
    if (!userLoser) return { userWinner };

    return { userWinner, userLoser };
  }

  nextTurn(toggle = true): string {
    if (toggle) this.turnStatus = !this.turnStatus;

    return this.players.map((user) => String(user?.id))[Number(this.turnStatus)];
  }

  setNextTurn(user: User): void {
    this.turnStatus = Boolean(this.players.indexOf(user));
  }

  gameId(): string {
    if (!this.gameIds) this.gameIds = uuid4();

    return this.gameIds;
  }

  allPlayers(): User[] {
    return this.players.filter((user) => user !== undefined);
  }

  addPlayer(user?: User): boolean {
    if (this.players.includes(user)) return false;
    if (user) {
      this.players[this.players.length ? 0 : 1] = user;

      return true;
    }

    return false; // never
  }

  removePlayer(user: User): void {
    removeFromArray(this.players, user);
  }

  getPlayer(userId: string): User | undefined {
    return this.allPlayers().find((user) => user.id === userId);
  }

  isFull(): boolean {
    return this.allPlayers().length === 2;
  }

  roomUsers(): RoomUsers[] {
    return this.allPlayers().map((user, index) => ({
      name: user.name,
      index,
    }));
  }

  anotherPlayer(user: User): User | undefined {
    return this.allPlayers().find((player) => player !== user);
  }
}

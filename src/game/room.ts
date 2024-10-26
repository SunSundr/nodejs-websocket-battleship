import { User } from '../user/user';
import { uuid4 } from '../utils/uuid';
import { removeFromArray } from '../utils/array';
import { RoomUsers } from './types';

export class Room {
  private readonly players: [User?, User?] = [];
  readonly id: string;
  private gameIds?: string;

  constructor() {
    this.id = uuid4();
  }

  static create(user: User | undefined, rooms: Map<string | number, Room>): Room {
    const room = new Room();
    if (user) {
      room.addPlayer(user);
      user.rooms.push(room);
    }

    rooms.set(room.id, room);

    return room;
  }

  static findRoomByGameId(gameId: string, rooms: Map<string | number, Room>): Room | undefined {
    for (const room of Array.from(rooms.values())) {
      if (room.gameIds === gameId) return room;
    }

    return undefined;
  }

  turnId(): string {
    return '';
  }

  gameId(): string {
    if (!this.gameIds) this.gameIds = uuid4();

    return this.gameIds;
  }

  allPlayers(): User[] {
    return this.players.filter((user) => user !== undefined);
  }

  addPlayer(user?: User): void {
    if (this.players.includes(user)) return;
    if (user) this.players[this.players.length ? 0 : 1] = user;
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

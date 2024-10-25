import { User } from '../user/user';
import { Game } from './game';
import { uuid4 } from '../utils/uuid';
import { removeFromArray } from '../utils/array';
import { RoomUsers } from './types';

export class Room {
  private readonly players: [User?, User?] = [];
  readonly id: string;
  private gameObj?: Game;

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

  game(): Game {
    if (!this.gameObj) this.addGame();

    return this.gameObj as Game;
  }

  allPlayers(): User[] {
    return this.players.filter((user) => user !== undefined);
  }

  addPlayer(user?: User): void {
    if (user) this.players[this.players.length ? 0 : 1] = user;
  }

  removePlayer(user: User): void {
    removeFromArray(this.players, user);
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

  addGame(): void {
    this.gameObj = new Game();
  }
}

import { WebSocket } from 'ws';
import { uuid4 } from '../utils/uuid';
import { Room } from '../game/room';

export class User {
  winsCount = 0;
  readonly rooms: Room[] = [];
  readonly id: string;

  constructor(
    public readonly name: string,
    public readonly connection: WebSocket
  ) {
    this.id = uuid4();
  }

  addWins(status: number): void {
    this.winsCount += status;
  }
}

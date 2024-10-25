import { WebSocket } from 'ws';

export class User {
  winsCount = 0;
  rooms: string[] = [];
  games: string[] = [];

  constructor(
    public readonly name: string,
    private readonly connection: WebSocket
  ) {}

  addWins(status: number): void {
    this.winsCount += status;
  }
}

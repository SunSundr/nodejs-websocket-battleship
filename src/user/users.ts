import { WebSocket } from 'ws';
import { User } from './user';
import { UserDb } from '../db/userDb';
import { WsMessage, RegData } from '../ws_server/types';

export class Users {
  private readonly users = new Map<WebSocket, User>();

  constructor(private readonly userDb: UserDb) {}

  getAll(): User[] {
    return Array.from(this.users.values());
  }

  getUser(ws: WebSocket): User | undefined {
    return this.users.get(ws);
  }

  delete(ws: WebSocket): void {
    this.users.delete(ws);
  }

  updateWins(ws: WebSocket, status: number): void {
    const user = this.users.get(ws);
    if (user) {
      user.addWins(status);
      const userDb = this.userDb.getUserWithoutVerification(user.name);
      if (userDb) userDb.winn = userDb.winn ?? 0 + status;
    }
  }

  addUser(ws: WebSocket, msg: WsMessage): WsMessage {
    const regData = this.userDb.addUser(msg.data as RegData);
    if (!regData.error) {
      const user = this.users.get(ws) || new User(regData.name, ws);
      user.winsCount = this.userDb.getUserWithoutVerification(regData.name)?.winn ?? 0;
      this.users.set(ws, user);
    }

    return { ...msg, data: regData };
  }
}

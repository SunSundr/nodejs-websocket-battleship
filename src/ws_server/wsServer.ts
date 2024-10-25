import { WebSocket, WebSocketServer, RawData } from 'ws';
import { Users } from '../user/users';
import { UserDb } from '../db/userDb';
import { MSG_TYPES, WsMessage } from './types';

export class WsServer {
  private readonly users: Users;
  private readonly connections: WebSocket[] = [];

  constructor(
    private readonly userDb: UserDb,
    private readonly wss = new WebSocketServer({ port: 3000 })
  ) {
    this.users = new Users(this.userDb);

    wss.on('connection', (ws, _req) => {
      console.log('WebSocket new connection');
      this.connections.push(ws);

      ws.on('message', (message) => {
        try {
          this.handleMessage(ws, this.getWsMessage(message));
        } catch (error) {
          console.error('Error parsing JSON:', error);
          ws.send(JSON.stringify({ error: 'Error parsing JSON' }));
        }
      });

      ws.on('close', () => {
        // this.users.delete(ws);
        console.log('WebSocket close');
      });
    });
  }

  getWsMessage(msg: RawData): WsMessage {
    const wsMsg = JSON.parse(msg.toString()) as WsMessage;
    if (typeof wsMsg.data === 'string') wsMsg.data = JSON.parse(wsMsg.data);

    return wsMsg;
  }

  stringifyWsMessage(msg: WsMessage): string {
    return JSON.stringify({ ...msg, data: JSON.stringify(msg.data) });
  }

  updateWinners(): void {
    // maybe this.userDb ???
    const data = this.users
      .getAll()
      .filter((user) => user.winsCount > 0)
      .map((user) => ({
        name: user.name,
        wins: user.winsCount,
      }));

    const winnersStr = this.stringifyWsMessage({
      type: MSG_TYPES.updateWinners,
      data,
      id: 0,
    });

    this.connections.forEach((ws) => ws.send(winnersStr));
  }

  handleMessage(ws: WebSocket, msg: WsMessage): void {
    console.log('>> ', msg);

    switch (msg.type) {
      case MSG_TYPES.registration:
        ws.send(this.stringifyWsMessage(this.users.addUser(ws, msg)));
        this.updateWinners();
        break;

      // case 'joinGame':
      //   break;

      // case 'makeMove':
      //   break;

      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }
}

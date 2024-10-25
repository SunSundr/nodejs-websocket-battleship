import { WebSocket, WebSocketServer, RawData } from 'ws';
import { removeFromArray } from '../utils/array';
import { Users } from '../user/users';
import { UserDb } from '../db/userDb';
import { Room } from '../game/room';
import { MSG_TYPES, WsMessage } from './types';
import { RoomIndex, GameData } from '../game/types';
// import { RoomData } from '../game/types';
// import { uuid4 } from '../utils/uuid';

export class WsServer {
  private readonly users: Users;
  private readonly connections: WebSocket[] = [];
  private readonly rooms = new Map<string | number, Room>();

  constructor(
    private readonly userDb: UserDb,
    private readonly port: number,
    private readonly wss = new WebSocketServer({ port })
  ) {
    this.users = new Users(this.userDb);

    wss.on('connection', (ws, _req) => {
      console.log('WebSocket: new connection');
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
        this.users.delete(ws);
        removeFromArray(this.connections, ws);
        console.log('WebSocket closed');
      });

      ws.on('error', (err) => {
        console.error('[Error]', 'WebSocket error:', err.message);
      });
    });

    wss.on('close', () => console.log('WebSocketServer closed'));
    wss.on('listening', () => console.log(`WebSocketServer listening on port ${this.port}`));
  }

  getWsMessage(msg: RawData): WsMessage {
    const wsMsg = JSON.parse(msg.toString()) as WsMessage;
    if (typeof wsMsg.data === 'string' && wsMsg.data.length) {
      try {
        wsMsg.data = JSON.parse(wsMsg.data);
      } catch {
        // nothing
      }
    }

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

  createRoom(ws: WebSocket): void {
    Room.create(this.users.getUser(ws), this.rooms);
  }

  updateRooms(): void {
    const data = Array.from(this.rooms.values())
      .filter((room) => !room.isFull())
      .map((room) => ({
        roomId: room.id,
        roomUsers: room.roomUsers(),
      }));

    const roomsStr = this.stringifyWsMessage({
      type: MSG_TYPES.updateRoom,
      data,
      id: 0,
    });

    this.connections.forEach((ws) => ws.send(roomsStr));
  }

  addUsertoRoom(ws: WebSocket, roomId: string | number): void {
    const room = this.rooms.get(roomId);
    const user = this.users.getUser(ws);
    if (user && room) {
      room.addPlayer(user);
      if (room.isFull()) {
        room.addGame();
        const msg = {
          type: MSG_TYPES.createGame,
          id: 0,
        };
        room.allPlayers().forEach((usr) => {
          const uws = room.anotherPlayer(usr)?.connection;
          if (uws) {
            const data: GameData = {
              idGame: room.game().id,
              idPlayer: usr.id,
            };
            uws.send(
              this.stringifyWsMessage({
                ...msg,
                data,
              })
            );
          }
        });
      }
    } else {
      if (!user) console.error('[Error]', 'App error:', 'User not found');
      if (!room) console.error('[Error]', 'App error:', `Room with id ${roomId} not found`);
    }
  }

  handleMessage(ws: WebSocket, msg: WsMessage): void {
    console.log('>> ', msg);

    switch (msg.type) {
      case MSG_TYPES.registration:
        ws.send(this.stringifyWsMessage(this.users.addUser(ws, msg)));
        this.updateRooms();
        this.updateWinners();
        break;

      case MSG_TYPES.createRoom:
        this.createRoom(ws);
        this.updateRooms();
        break;

      case MSG_TYPES.addUserToRoom:
        this.addUsertoRoom(ws, (msg.data as RoomIndex).indexRoom);
        break;

      default:
        console.error('[Error]', `Unknown message type: ${msg.type}`);
    }
  }
}

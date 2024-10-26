import { WebSocket, WebSocketServer, RawData } from 'ws';
import { removeFromArray } from '../utils/array';
import { Users } from '../user/users';
import { User } from '../user/user';
import { UserDb } from '../db/userDb';
import { Room } from '../game/room';
import { getErrorMessage, printError } from '../utils/error';
import { MSG_TYPES, WsMessage } from './types';
import { RoomIndex, GameData, ShipsData } from '../game/types';
import { CMD_PREFIX } from '../config';
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
          const msg = getErrorMessage(error);
          printError(`JSON parsing error: ${msg}`);
          this.sendError(ws, msg);
        }
      });

      ws.on('close', () => {
        const user = this.users.getUser(ws);
        this.users.delete(ws);
        removeFromArray(this.connections, ws);
        console.log(CMD_PREFIX.info, `User ${user?.id} disconnected (WebSocket closed)`);
      });

      ws.on('error', (err) => {
        printError('WebSocket error:', err.message);
      });
    });

    wss.on('close', () => console.log('WebSocketServer closed')); // restart ?
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

  startGame(gameId: string, user1: User, user2: User): void {
    [user1, user2].forEach((user) => {
      user.connection.send(
        this.stringifyWsMessage({
          type: MSG_TYPES.startGame,
          data: {
            ships: user.gameBoard(gameId).ships,
            currentPlayerIndex: user.id,
          },
          id: 0,
        })
      );
    });
  }

  addShips(ws: WebSocket, shipsData: ShipsData): void {
    const room = Room.findRoomByGameId(shipsData.gameId, this.rooms);
    if (room) {
      const user1 = this.users.getUser(ws);
      if (user1) {
        const gameBoard = user1.gameBoard(shipsData.gameId);
        gameBoard.addShips(shipsData.ships);
        gameBoard.readyState = true;
        const user2 = room.getPlayer(shipsData.indexPlayer); // or const user2 = room.anotherPlayer(user1);
        if (user2 && user2.gameBoard(shipsData.gameId).readyState) {
          this.startGame(shipsData.gameId, user1, user2);
        }
      } else {
        printError(`User ID '${shipsData.indexPlayer}' in Room ID '${room.id}' not found`);
      }
    } else {
      printError(`Room with game ID '${shipsData.gameId}' not found`);
    }
  }

  addUserToRoom(ws: WebSocket, roomId: string | number): void {
    const room = this.rooms.get(roomId);
    const user = this.users.getUser(ws);
    if (user && room) {
      room.addPlayer(user);
      if (room.isFull()) {
        const msg = {
          type: MSG_TYPES.createGame,
          id: 0,
        };
        room.allPlayers().forEach((usr) => {
          usr.addGameBoard(room.gameId());
          const uws = room.anotherPlayer(usr)?.connection;
          if (uws) {
            const data: GameData = {
              idGame: room.gameId(),
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
      if (!user) printError('User not found (unknown connection)');
      if (!room) printError(`Room with ID '${roomId}' not found`);
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
        this.addUserToRoom(ws, (msg.data as RoomIndex).indexRoom);
        this.updateRooms();
        break;

      case MSG_TYPES.addShips:
        this.addShips(ws, msg.data as ShipsData);
        break;

      default:
        printError('Unknown message type:', msg.type);
        this.sendError(ws, `Unknown message type: ${msg.type}`);
    }
  }

  sendError(ws: WebSocket, msg: string): void {
    ws.send(
      this.stringifyWsMessage({
        type: `${MSG_TYPES.error}: "${msg}"` as MSG_TYPES,
        data: '', // not used
        id: 0,
      })
    );
  }
}

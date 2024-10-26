import { WebSocket, WebSocketServer, RawData } from 'ws';
import { removeFromArray } from '../utils/array';
import { Users } from '../user/users';
import { User } from '../user/user';
import { UserDb } from '../db/userDb';
import { Room } from '../game/room';
import { getErrorMessage } from '../utils/error';
import { printCommand, printError, printInfo } from '../utils/print';
import { MSG_TYPES, WsMessage, RegData, AttackData } from './types';
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
      console.log('WebSocket: new connection...');
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
        user?.rooms.forEach((room) => {
          if (room.isFull()) {
            const user2 = room.anotherPlayer(user);
            // if (user2) this.finish(user2.connection, user, false);
            if (user2) this.diconnect(user2.connection);
          }

          this.rooms.delete(room.id);
        });
        removeFromArray(this.connections, ws);
        this.updateRooms(ws);
        this.users.delete(ws);
        console.log(
          CMD_PREFIX.info,
          user
            ? `User ${user.name} (ID '${user?.id}') disconnected.`
            : 'WebSocket connection closed.'
        );
      });

      ws.on('error', (err) => {
        printError('WebSocket error:', err.message);
      });
    });

    wss.on('close', () => console.log(CMD_PREFIX.warn, 'WebSocketServer closed')); // restart ?
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

  registration(ws: WebSocket, msg: WsMessage): boolean {
    const result = this.users.addUser(ws, msg);
    ws.send(this.stringifyWsMessage(result));
    const error = (result.data as RegData)?.errorText;
    if (error) {
      printError(error);

      return false;
    }

    const user = this.users.getUser(ws);
    printCommand(
      MSG_TYPES.registration,
      `User ${user?.name} (ID '${user?.id}') has successfully registered.`
    );

    return true;
  }

  updateWinners(ws: WebSocket, single = false): void {
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

    if (single || this.users.count() === 1) {
      ws.send(winnersStr);
      const user = this.users.getUser(ws);
      printCommand(
        MSG_TYPES.updateWinners,
        `User ${user?.name} (ID '${user?.id}') has been sent a list of winners.`
      );
    } else {
      this.connections.forEach((uws) => uws.send(winnersStr));
      printCommand(MSG_TYPES.updateRoom, 'All connections have been notified of the winners.');
    }
  }

  createRoom(ws: WebSocket): void {
    Room.create(this.users.getUser(ws), this.rooms);
  }

  updateRooms(ws: WebSocket, single = false): void {
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

    if (single || this.users.count() === 1) {
      ws.send(roomsStr);
      const user = this.users.getUser(ws);
      printCommand(
        MSG_TYPES.updateRoom,
        `User ${user?.name} (ID '${user?.id}') has been sent a list of available rooms.`
      );
    } else {
      this.connections.forEach((uws) => uws.send(roomsStr));
      printCommand(
        MSG_TYPES.updateRoom,
        'All connections have been notified of rooms with a single player.'
      );
    }
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
    printCommand(
      MSG_TYPES.startGame,
      `Start of a game between ${user1.name} (ID '${user1.id}') and ${user1.name} (ID '${user2.id}').`
    );
    printInfo('The first player to submit their ship positions goes first.');
  }

  addShips(ws: WebSocket, shipsData: ShipsData): void {
    const room = Room.findRoomByGameId(shipsData.gameId, this.rooms);
    if (room) {
      const user1 = this.users.getUser(ws);
      if (user1) {
        const gameBoard = user1.gameBoard(shipsData.gameId);
        gameBoard.addShips(shipsData.ships, room);
        gameBoard.readyState = true;
        printCommand(
          MSG_TYPES.addShips,
          `Initialized ship positions for ${user1.name} (ID '${user1.id}')`
        );
        const user2 = room.getPlayer(shipsData.indexPlayer); // or const user2 = room.anotherPlayer(user1);
        if (user2 && user2.gameBoard(shipsData.gameId).readyState) {
          this.startGame(shipsData.gameId, user1, user2);
          this.turn(room, false);
        } else {
          room.setNextTurn(user1);
        }
      } else {
        printError(`User ID '${shipsData.indexPlayer}' in Room ID '${room.id}' not found.`);
      }
    } else {
      printError(`Room with game ID '${shipsData.gameId}' not found.`);
    }
  }

  addUserToRoom(ws: WebSocket, roomId: string | number): boolean {
    const room = this.rooms.get(roomId);
    const user = this.users.getUser(ws);
    if (user && room) {
      if (room.addPlayer(user)) {
        if (room.isFull()) {
          const msg = {
            type: MSG_TYPES.createGame,
            id: 0,
          };

          user.rooms.add(room);

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

        return true;
      }

      printError(`User ${user.name} (ID '${user.id}') is already in the room.`);
    } else {
      if (!user) printError('User not found (unknown connection).');
      if (!room) printError(`Room with ID '${roomId}' not found.`);
    }

    return false;
  }

  turn(room: Room, toggleTurn = true): void {
    room.allPlayers().forEach((user) => {
      user.connection.send(
        this.stringifyWsMessage({
          type: MSG_TYPES.turn,
          data: {
            currentPlayer: room.nextTurn(toggleTurn),
          },
          id: 0,
        })
      );
    });
  }

  attack(ws: WebSocket, attackData: AttackData): boolean {
    const user = this.users.getUser(ws);
    if (user) {
      const room = Room.findRoomByGameId(attackData.gameId, this.rooms);
      if (room) {
        if (room.nextTurn(false) === attackData.indexPlayer) {
          return true;
        }
      }
    }

    return false;
  }

  finish(room: Room): void {
    const { userWinner, userLoser } = room.statistic();
    if (!userWinner || !userLoser) return;
    [userWinner, userLoser].forEach((user) => {
      user.connection.send(
        this.stringifyWsMessage({
          type: MSG_TYPES.finish,
          data: { winPlayer: userLoser.id },
          id: 0,
        })
      );
      user.rooms.delete(room);
      user.deleteGameBoard(room.id);
    });
    userWinner.addWins(1);
    this.rooms.delete(room.id);
    this.updateWinners(userWinner.connection);
    printCommand(
      MSG_TYPES.finish,
      `User ${userWinner.name} (id '${userWinner.id}') is the winner.`
    );
  }

  diconnect(ws: WebSocket): void {
    ws.send(
      this.stringifyWsMessage({
        type: MSG_TYPES.diconnect,
        data: '',
        id: 0,
      })
    );
  }

  handleMessage(ws: WebSocket, msg: WsMessage): void {
    console.log('>> ', msg);

    switch (msg.type) {
      case MSG_TYPES.registration:
        if (this.registration(ws, msg)) {
          this.updateRooms(ws, true);
          this.updateWinners(ws, true);
        }
        break;

      case MSG_TYPES.createRoom:
        this.createRoom(ws);
        this.updateRooms(ws);
        break;

      case MSG_TYPES.addUserToRoom:
        if (this.addUserToRoom(ws, (msg.data as RoomIndex).indexRoom)) this.updateRooms(ws);
        break;

      case MSG_TYPES.addShips:
        this.addShips(ws, msg.data as ShipsData);
        break;

      case MSG_TYPES.attack:
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

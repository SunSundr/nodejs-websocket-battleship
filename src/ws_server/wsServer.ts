import { WebSocket, WebSocketServer } from 'ws';
import { removeFromArray } from '../utils/array';
import { Users } from '../user/users';
import { User } from '../user/user';
import { UserDb } from '../db/userDb';
import { Room } from '../game/room';
import { parseWsMessage, stringifyWsMessage } from './wsMessage';
import { getErrorMessage } from '../utils/error';
import { printCommand, printError, printInfo } from '../utils/print';
import { MSG_TYPES, WsMessage, RegData } from './types';
import { RoomIndex, GameData, ShipsData, AttackData, HitType, Point } from '../game/types';
import { BotClient } from '../bot/botClient';
import { CMD_PREFIX, WSS_PORT } from '../config';
// import { RoomData } from '../game/types';
// import { uuid4 } from '../utils/uuid';

export class WsServer {
  private readonly users: Users;
  private readonly connections: WebSocket[] = [];
  private readonly rooms = new Map<string | number, Room>();
  private readonly bots: BotClient[] = [];

  constructor(
    private readonly userDb: UserDb,
    private readonly port: number,
    private readonly wss = new WebSocketServer({ port })
  ) {
    this.users = new Users(this.userDb);

    wss.on('connection', (ws, req) => {
      console.log('WebSocket: new connection...');
      this.connections.push(ws);
      const isBot = req.headers['user-agent'] === 'Bot';
      if (isBot) {
        const userId = req.headers['x-user-id'];
        if (typeof userId === 'string') {
          const user = this.users.findUser(userId);
          if (user) this.startGameWithBot(user, ws);
        }
      }

      ws.on('message', (message) => {
        try {
          this.handleMessage(ws, parseWsMessage(message));
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

    wss.on('error', (err) =>
      console.log(CMD_PREFIX.error, 'WebSocketServer error', getErrorMessage(err))
    );
    wss.on('close', () => console.log(CMD_PREFIX.warn, 'WebSocketServer closed')); // restart ?
    wss.on('listening', () => console.log(`WebSocketServer listening on port ${this.port}`));
  }

  registration(ws: WebSocket, msg: WsMessage): boolean {
    const result = this.users.addUser(ws, msg);
    ws.send(stringifyWsMessage(result));
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

    const winnersStr = stringifyWsMessage({
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

  startBot(ws: WebSocket): void {
    const user = this.users.getUser(ws);
    if (user) {
      const bot = new BotClient(`ws://localhost:${WSS_PORT}/bot`, user.id);
      this.bots.push(bot);
    }
  }

  startGameWithBot(user: User, botWs: WebSocket): void {
    const room = Room.create(this.users.getUser(user.connection), this.rooms);
    this.users.addBotUser(botWs);
    this.addUserToRoom(botWs, room.id);
  }

  createRoom(ws: WebSocket): void {
    Room.create(this.users.getUser(ws), this.rooms);
  }

  updateRooms(ws?: WebSocket, single = false): void {
    const data = Array.from(this.rooms.values())
      .filter((room) => !room.isFull())
      .map((room) => ({
        roomId: room.id,
        roomUsers: room.roomUsers(),
      }));

    const roomsStr = stringifyWsMessage({
      type: MSG_TYPES.updateRoom,
      data,
      id: 0,
    });

    if (ws && (single || this.users.count() === 1)) {
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
        stringifyWsMessage({
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
      `Start of a game between ${user1.name} (ID '${user1.id}') and ${user2.name} (ID '${user2.id}').`
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

  deleteRoom(ws: WebSocket, room: Room): void {
    const users = room.allPlayers();
    users.forEach((user) => {
      user.rooms.delete(room);
      user.deleteGameBoard(room.id);
    });
    this.rooms.delete(room.id);
    const user = this.users.getUser(ws);
    if (user) {
      const msg = `User ${user.name} (ID '${user.id}') is already in the room. Room removed.`;
      this.sendError(ws, msg);
      printError(msg);
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
                stringifyWsMessage({
                  ...msg,
                  data,
                })
              );
            }
          });

          this.updateRooms();

          return false;
        }
      }

      this.deleteRoom(ws, room);

      return true;
    }

    if (!user) printError('User not found (unknown connection).');
    if (!room) printError(`Room with ID '${roomId}' not found.`);

    return false;
  }

  turn(room: Room, toggleTurn = true): void {
    room.allPlayers().forEach((user) => {
      user.connection.send(
        stringifyWsMessage({
          type: MSG_TYPES.turn,
          data: {
            currentPlayer: room.nextTurn(toggleTurn),
          },
          id: 0,
        })
      );
    });
  }

  attack(ws: WebSocket, attackData: AttackData): void {
    const user = this.users.getUser(ws);
    if (!user) return;
    const room = Room.findRoomByGameId(attackData.gameId, this.rooms);
    if (!room) return;
    if (room.nextTurn(false) === attackData.indexPlayer) {
      const enemy = room.anotherPlayer(user);
      if (enemy) {
        const board = enemy.gameBoard(attackData.gameId);
        const { x, y } = (
          attackData.x && attackData.y ? attackData : board.randomAttackPoint()
        ) as { x: number; y: number };
        const result = board.attack(x, y);
        const turnPoints = [{ x, y }];
        // if (user.name !== 'Bot') {
        //   console.log([turnPoints[0].x, turnPoints[0].y], [result.point.x, result.point.y]);
        // }

        if (result.status === HitType.repeat) {
          // let countRepeat = 0;
          // const interval = setInterval(() => {
          //   this.attackFeedback([ws], enemy.id, turnPoints, HitType.miss);
          //   if (countRepeat === 2) clearInterval(interval);
          //   countRepeat++;
          // }, 600);

          console.log('[REPEAT]', `Click on [${attackData.x}, ${attackData.y}]`);
          // this.turn(room, false);

          // return;
        }

        if (result.aroundCells) {
          const hitType = result.shipCells ? HitType.killed : HitType.shot;
          this.attackFeedback([ws, enemy.connection], enemy.id, turnPoints, hitType); // shot or kill:
          this.attackFeedback([ws, enemy.connection], enemy.id, result.aroundCells, HitType.miss); // check around
          if (result.shipCells)
            this.attackFeedback([ws], enemy.id, result.shipCells, HitType.killed); // kill:
          if (result.finish) {
            room.winner = user;
            this.finish(room);

            return;
          }
        } else {
          // miss
          this.attackFeedback([ws, enemy.connection], enemy.id, turnPoints, HitType.miss);
          room.nextTurn();
        }

        this.turn(room, false);
      }
    } else if (attackData.x) {
      console.log('[IGNORE]', `Click on [${attackData.x}, ${attackData.y}]`);
    }
  }

  attackFeedback(wsa: WebSocket[], userId: string, points: Point[], status: HitType): void {
    wsa.forEach((ws) => {
      points.forEach((point) => {
        ws.send(
          stringifyWsMessage({
            type: MSG_TYPES.attack,
            data: {
              position: { ...point },
              currentPlayer: userId,
              status,
            },
            id: 0,
          })
        );
      });
    });
  }

  finish(room: Room): void {
    const { userWinner, userLoser } = room.statistic();
    if (!userWinner || !userLoser) return;
    [userWinner, userLoser].forEach((user) => {
      user.connection.send(
        stringifyWsMessage({
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
      stringifyWsMessage({
        type: MSG_TYPES.diconnect,
        data: '',
        id: 0,
      })
    );
  }

  handleMessage(ws: WebSocket, msg: WsMessage): void {
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
      case MSG_TYPES.randomAttack:
        this.attack(ws, msg.data as AttackData);
        break;

      case MSG_TYPES.single_play:
        this.startBot(ws);
        break;

      default:
        printError('Unknown message type:', msg.type);
        this.sendError(ws, `Unknown message type: ${msg.type}`);
    }
  }

  sendError(ws: WebSocket, msg: string): void {
    ws.send(
      stringifyWsMessage({
        type: `${MSG_TYPES.error}: "${msg}"` as MSG_TYPES,
        data: '', // not used
        id: 0,
      })
    );
  }
}

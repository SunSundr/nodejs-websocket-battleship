import { styleText } from 'node:util';
import WebSocket from 'ws';
import { GameBoard } from '../game/gameBoard';
import { GameData, AttackFeedback, Point, HitType } from '../game/types';
import { parseWsMessage, stringifyWsMessage } from '../ws_server/wsMessage';
import { MSG_TYPES, WsMessage, TurnData } from '../ws_server/types';
import { printError, printLog } from '../utils/print';
import { getErrorMessage } from '../utils/error';

interface FindShip {
  firstPosition?: Point;
  positions: Point[];
  direction: boolean | null; // false - horizontal; true - vertical; null - unknown
}

const DELAY_LIMITS = { min: 400, max: 800 };

export class BotClient {
  readonly ws: WebSocket;
  private readonly enemyBoard = new GameBoard();
  private readonly myBoard = new GameBoard();
  private idGame: string | number = 0;
  private idPlayer: string | number = 0;
  turnState = false;
  private shipShot?: FindShip;
  private isFinish = false;

  constructor(serverUrl: string, userId: string) {
    this.ws = new WebSocket(serverUrl, {
      headers: { 'user-agent': 'Bot', 'x-user-id': userId },
    });

    this.ws.on('open', () => {
      printLog(
        styleText('bgCyanBright', ` Bot connected to server ${styleText('italic', serverUrl)} `),
        '\uFEFF'
      );
    });

    this.ws.on('message', (message) => {
      try {
        this.handleMessage(parseWsMessage(message));
      } catch (error) {
        const msg = getErrorMessage(error);
        printError(`JSON parsing error: ${msg}`);
      }
    });

    this.ws.on('close', () => {
      printLog(
        styleText(
          this.isFinish ? 'bgGray' : 'bgRedBright',
          ` Bot disconnected from server ${styleText('italic', serverUrl)} `
        ),
        '\uFEFF'
      );
    });

    this.ws.on('error', (err) => {
      printError(styleText('bgRed', 'Bot WebSocket error:'), err.message);
    });
  }

  static new(...args: [string, string]): BotClient {
    return new BotClient(...args);
  }

  private delay(): number {
    return Math.floor(Math.random() * (DELAY_LIMITS.max - DELAY_LIMITS.min + 1)) + DELAY_LIMITS.min;
  }

  private sendMessage(msg: WsMessage) {
    this.ws.send(stringifyWsMessage(msg));
  }

  setGameData(data: GameData): void {
    this.idPlayer = data.idPlayer;
    this.idGame = data.idGame;
  }

  placeShips(): void {
    this.myBoard.autoPlaceShips();
    const ships = this.myBoard.retrieveShips();
    this.sendMessage({
      type: MSG_TYPES.addShips,
      data: {
        gameId: this.idGame,
        ships,
        indexPlayer: this.idPlayer,
      },
      id: 0,
    });
  }

  toggleTurn(data: TurnData): void {
    this.turnState = this.idPlayer === data.currentPlayer;
    setTimeout(() => {
      this.attack();
    }, this.delay());
  }

  attack(errPoint?: Point): void {
    if (this.turnState) {
      const result = errPoint || this.findShipPoint();
      this.sendMessage({
        type: MSG_TYPES.attack,
        data: {
          // AttackData
          gameId: this.idGame,
          x: result.x,
          y: result.y,
          indexPlayer: this.idPlayer,
        },
        id: 0,
      });
    }
  }

  findShipPoint(): Point {
    if (this.shipShot) {
      for (const pt of this.shipShot.positions) {
        const point = this.enemyBoard.findClosestPoint(pt, this.shipShot.direction);
        if (point) return point;
      }
    }

    return this.enemyBoard.randomAttackPointBot();
  }

  setAttackResult(data: AttackFeedback): void {
    if (this.idPlayer === data.currentPlayer) {
      const { x, y } = data.position;
      const { status } = data;
      this.enemyBoard.setState(x, y, status);
      if (status === HitType.shot) {
        const point: Point = { x, y };
        if (this.shipShot) {
          this.shipShot.positions.push(point);
          if (this.shipShot.direction === null)
            this.shipShot.direction = this.shipShot.positions[0].x === point.x;
        } else {
          this.shipShot = {
            positions: [point],
            direction: null,
          };
        }
      } else if (status === HitType.killed) {
        this.shipShot = undefined;
      }
    }
  }

  handleMessage(msg: WsMessage): void {
    switch (msg.type) {
      case MSG_TYPES.createGame:
        this.setGameData(msg.data as GameData);
        // this.startTimeout = setTimeout(() => {
        this.placeShips();
        // }, 60_000);
        break;

      case MSG_TYPES.startGame:
        break;

      case MSG_TYPES.turn:
        this.toggleTurn(msg.data as TurnData);
        break;

      case MSG_TYPES.attack:
        this.setAttackResult(msg.data as AttackFeedback);
        break;

      case MSG_TYPES.finish:
      case MSG_TYPES.diconnect:
        this.isFinish = msg.type === MSG_TYPES.finish;
        this.ws.close();
        break;

      case MSG_TYPES.updateRoom:
      case MSG_TYPES.updateWinners:
        break;

      case MSG_TYPES.repeat:
        // algorithm error / never:
        this.attack(this.enemyBoard.randomAttackPoint());
        break;

      default:
        if (!msg.type.startsWith(MSG_TYPES.error)) {
          printError('[BOT] Unknown message type:', msg.type);
        }
    }
  }
}

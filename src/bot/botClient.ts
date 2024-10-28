import WebSocket from 'ws';
import { GameBoard } from '../game/gameBoard';
import { GameData } from '../game/types';
import { parseWsMessage, stringifyWsMessage } from '../ws_server/wsMessage';
import { MSG_TYPES, WsMessage, TurnData } from '../ws_server/types';
import { printError } from '../utils/print';
import { getErrorMessage } from '../utils/error';

export class BotClient {
  readonly ws: WebSocket;
  private readonly enemyBoard = new GameBoard();
  private readonly myBoard = new GameBoard();
  private idGame: string | number = 0;
  private idPlayer: string | number = 0;
  turnState = false;

  constructor(serverUrl: string, userId: string) {
    this.ws = new WebSocket(serverUrl, {
      headers: { 'user-agent': 'Bot', 'x-user-id': userId },
    });

    this.ws.on('open', () => {
      console.log(`Bot connected to server ${serverUrl}`);
    });

    this.ws.on('message', (message) => {
      try {
        this.handleMessage2(parseWsMessage(message));
      } catch (error) {
        const msg = getErrorMessage(error);
        printError(`JSON parsing error: ${msg}`);
      }
    });

    this.ws.on('close', () => {
      console.log(`Bot disconnected from server ${serverUrl}`);
    });

    this.ws.on('error', (err) => {
      printError('Bot WebSocket error:', err.message);
    });
  }

  private delay(): number {
    return Math.floor(Math.random() * (900 - 400 + 1)) + 400;
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

  attack(): void {
    if (this.turnState) {
      const result = this.enemyBoard.randomAttack();
      this.sendMessage({
        type: MSG_TYPES.attack,
        data: {
          // AttackData
          gameId: this.idGame,
          x: result.point.x,
          y: result.point.y,
          indexPlayer: this.idPlayer,
        },
        id: 0,
      });
    }
  }

  handleMessage2(msg: WsMessage): void {
    switch (msg.type) {
      case MSG_TYPES.createGame:
        this.setGameData(msg.data as GameData);
        this.placeShips();
        break;

      case MSG_TYPES.startGame:
        break;

      case MSG_TYPES.turn:
        this.toggleTurn(msg.data as TurnData);
        break;

      case MSG_TYPES.attack:
      case MSG_TYPES.finish:
      case MSG_TYPES.diconnect:
      case MSG_TYPES.updateRoom:
      case MSG_TYPES.updateWinners:
        break;

      default:
        if (!msg.type.startsWith(MSG_TYPES.error)) {
          printError('[BOT] Unknown message type:', msg.type);
        }
    }
  }
}

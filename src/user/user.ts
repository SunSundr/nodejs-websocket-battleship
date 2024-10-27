import { WebSocket } from 'ws';
import { uuid4 } from '../utils/uuid';
import { type Room } from '../game/room';
import { GameBoard } from '../game/gameBoard';

export class User {
  winsCount = 0;
  private readonly gameBoardMap = new Map<string | number, GameBoard>();
  readonly rooms = new Set<Room>();

  readonly id: string;

  constructor(
    public readonly name: string,
    public readonly connection: WebSocket
  ) {
    this.id = uuid4();
  }

  addGameBoard(gameId: string | number): GameBoard {
    const gameBoard = new GameBoard(this);
    this.gameBoardMap.set(gameId, gameBoard);

    return gameBoard;
  }

  deleteGameBoard(gameId: string): void {
    this.gameBoardMap.delete(gameId);
  }

  gameBoard(gameId: string | number): GameBoard {
    let gameBoard = this.gameBoardMap.get(gameId);
    if (!gameBoard) gameBoard = this.addGameBoard(gameId);

    return gameBoard;
  }

  addWins(status: number): void {
    this.winsCount += status;
  }
}

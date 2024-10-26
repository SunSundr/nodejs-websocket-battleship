import { WebSocket } from 'ws';
import { uuid4 } from '../utils/uuid';
import { Room } from '../game/room';
import { GameBoard } from '../game/gameBoard';

export class User {
  winsCount = 0;
  private readonly gameBoardMap = new Map<string, GameBoard>();
  readonly rooms: Room[] = [];
  readonly id: string;

  constructor(
    public readonly name: string,
    public readonly connection: WebSocket
  ) {
    this.id = uuid4();
  }

  addGameBoard(gameId: string): GameBoard {
    const gameBoard = new GameBoard();
    this.gameBoardMap.set(gameId, gameBoard);

    return gameBoard;
  }

  gameBoard(gameId: string): GameBoard {
    let gameBoard = this.gameBoardMap.get(gameId);
    if (!gameBoard) gameBoard = this.addGameBoard(gameId);

    return gameBoard;
  }

  addWins(status: number): void {
    this.winsCount += status;
  }
}

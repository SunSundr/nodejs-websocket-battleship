import { styleText } from 'node:util';
import { httpServer } from '../http_server/httpServer';
import { WsServer } from '../ws_server/wsServer';
import { UserDb } from '../db/userDb';

export class App {
  readonly server;
  readonly userDb;
  readonly wsServer;

  constructor(
    private readonly httpPort: number,
    private readonly wssPort: number
  ) {
    this.server = httpServer;
    this.userDb = new UserDb();
    this.wsServer = new WsServer(this.userDb, this.wssPort);
  }

  start(): void {
    this.server.listen(this.httpPort, () => {
      console.log(
        `Static HTTP server is running on port ${styleText('yellow', String(this.httpPort))}`
      );
      console.log(styleText('cyan', styleText('italic', 'http://localhost:8181/')));
      console.log('-'.repeat(50));
    });
  }
}

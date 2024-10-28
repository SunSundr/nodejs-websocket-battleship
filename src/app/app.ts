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
        `Start static http server on the ${styleText('yellow', String(this.httpPort))} port`
      );
      console.log('-'.repeat(50));
    });
  }
}

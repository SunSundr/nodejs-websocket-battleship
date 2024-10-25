import { Server } from 'node:http';
import { httpServer } from '../http_server/httpServer';
import { WsServer } from '../ws_server/server';
import { UserDb } from '../db/userDb';

export class App {
  public readonly server: Server;
  public readonly userDb = new UserDb();
  public readonly wsServer = new WsServer();

  constructor(public port: number) {
    this.server = httpServer;
  }

  start(): void {
    this.server.listen(this.port, () => {
      console.log(`Start static http server on the ${this.port} port`);
    });
  }
}

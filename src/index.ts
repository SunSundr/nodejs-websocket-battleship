import { App } from './app/app';
import { HTTP_PORT, WSS_PORT } from './config';

const app = new App(HTTP_PORT, WSS_PORT);
app.start();

if (process.env.NODE_ENV === 'development') {
  process.once('SIGINT', () => {
    app.userDb.saveDb();
    process.kill(process.pid, 'SIGINT');
  });
}

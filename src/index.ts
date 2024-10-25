import { App } from './app/app';

const HTTP_PORT = 8181;

const app = new App(HTTP_PORT);
app.start();

if (process.env.NODE_ENV === 'development') {
  process.once('SIGINT', () => {
    app.userDb.saveDb();
    process.kill(process.pid, 'SIGINT');
  });
}

import { WebSocket, WebSocketServer, RawData } from 'ws';
import { MSG_TYPES, WsMessage, RegData } from './types';

export class WsServer {
  private readonly connections: WebSocket[] = [];

  // constructor(private readonly wss = new WebSocket.Server({ port: 3000 })) {
  constructor(private readonly wss = new WebSocketServer({ port: 3000 })) {
    wss.on('connection', (ws, _req) => {
      console.log('WebSocket connection');
      this.connections.push(ws);

      ws.on('message', (message) => {
        try {
          this.handleMessage(ws, this.getWsMessage(message));
        } catch (error) {
          console.error('Error parsing JSON:', error);
          ws.send(JSON.stringify({ error: 'Error parsing JSON' }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket close');
      });
    });
  }

  getWsMessage(msg: RawData): WsMessage {
    const wsMsg = JSON.parse(msg.toString()) as WsMessage;
    if (typeof wsMsg.data === 'string') wsMsg.data = JSON.parse(wsMsg.data);

    return wsMsg;
  }

  stringifyWsMessage(msg: WsMessage): string {
    return JSON.stringify({ ...msg, data: JSON.stringify(msg.data) });
  }

  handleMessage(ws: WebSocket, msg: WsMessage): void {
    console.log('>> ', msg);

    switch (msg.type) {
      case 'reg':
        {
          const out = {
            type: MSG_TYPES.registration,
            data: {
              name: (msg.data as RegData).name,
              index: '1',
              // error: false,
              // errorText: '',
            },
            id: 0,
          };
          ws.send(this.stringifyWsMessage(out));
        }

        break;

      // case 'joinGame':
      //   break;

      // case 'makeMove':
      //   break;

      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }
}

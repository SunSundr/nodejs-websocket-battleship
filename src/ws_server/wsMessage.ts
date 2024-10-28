import { RawData } from 'ws';
import { WsMessage, MSG_TYPES } from './types';

export function parseWsMessage(msg: RawData): WsMessage {
  try {
    const wsMsg = JSON.parse(msg.toString()) as WsMessage;

    if (typeof wsMsg.data === 'string' && wsMsg.data.length) {
      try {
        wsMsg.data = JSON.parse(wsMsg.data);
      } catch {
        // nothing
      }
    }

    return wsMsg;
  } catch {
    return {
      type: MSG_TYPES.error,
      data: msg.toString(),
      id: 0,
    };
  }
}

export function stringifyWsMessage(msg: WsMessage): string {
  return JSON.stringify({ ...msg, data: JSON.stringify(msg.data) });
}

// export function getWsMessage(msg: RawData): WsMessage {
//   const wsMsg = JSON.parse(msg.toString()) as WsMessage;
//   if (typeof wsMsg.data === 'string' && wsMsg.data.length) {
//     try {
//       wsMsg.data = JSON.parse(wsMsg.data);
//     } catch {
//       // nothing
//     }
//   }

//   return wsMsg;
// }

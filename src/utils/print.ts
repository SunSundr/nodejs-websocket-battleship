import { styleText } from 'node:util';
import { CMD_PREFIX } from '../config';

export function printCommand(command: string, result?: string): void {
  console.log(CMD_PREFIX.cmd, styleText('yellow', command), result ? '->' : '', result);
}

export function printInfo(...msg: string[]): void {
  console.log(CMD_PREFIX.info, ...msg);
}

export function printError(...msg: string[]): void {
  console.error(CMD_PREFIX.error, ...msg);
}

export function formatID(id?: string): string {
  if (!id) return '';

  return styleText('gray', `(ID '${styleText('cyan', id)}')`);
}

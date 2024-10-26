import { CMD_PREFIX } from '../config';

export function printCommand(command: string, result?: string): void {
  console.log(CMD_PREFIX.cmd, command, result ? '->' : '', result);
}

export function printInfo(...msg: string[]): void {
  console.log(CMD_PREFIX.info, ...msg);
}

export function printError(...msg: string[]): void {
  console.error(CMD_PREFIX.error, ...msg);
}

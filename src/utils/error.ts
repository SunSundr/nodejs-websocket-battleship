import { CMD_PREFIX } from '../config';

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  return 'Unknown error';
}

export function printError(...msg: string[]): void {
  console.error(CMD_PREFIX.error, ...msg);
}

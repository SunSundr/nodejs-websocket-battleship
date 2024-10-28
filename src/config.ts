export const HTTP_PORT = 8181;
export const WSS_PORT = 3000;
export const BOARDSIZE = 10;

export enum CMD_PREFIX {
  info = '\x1b[36m[i]\x1b[0m', // cyan
  done = '\x1b[32m[Done]\x1b[0m', // green
  warn = '\x1b[33m[WARN]\x1b[0m', // yellow
  error = '\x1b[31m[ERROR]\x1b[0m', // red
  cmd = '\x1b[35m[CMD]\x1b[0m', // magenta
  ignore = '\x1b[90m[IGNORE]\x1b[0m', // gray
  repeat = '\x1b[90m[REPEAT]\x1b[0m', // gray
}

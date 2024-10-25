export interface UserData {
  hash: string;
  salt: string;
  winn?: number;
}

export interface DbObj {
  [name: string]: UserData;
}

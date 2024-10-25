export interface User {
  hash: string;
  salt: string;
}

export interface DbObj {
  [name: string]: User;
}

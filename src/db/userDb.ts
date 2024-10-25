import * as fs from 'node:fs';
import path from 'node:path';
import * as crypto from 'crypto';
import { UserData, DbObj } from './types';
import { RegData } from '../ws_server/types';

export class UserDb {
  private readonly db: DbObj = {};
  private readonly dbPath: string;

  constructor(loadFromFile = true) {
    this.dbPath = path.join(__dirname, 'db.json');
    if (loadFromFile) {
      try {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        this.db = JSON.parse(data);
      } catch (err) {
        console.error(
          '[Error]',
          'Failed to load database file:',
          err instanceof Error ? err.message : err
        );
        this.db = {};
      }
    } else {
      this.db = {};
    }
  }

  addUser(regData: RegData): RegData {
    const { name, password } = regData;
    if (!password) {
      return this.regDataOf(regData, this.error('Password cannot be empty or undefined'));
    }

    const existUser = this.getUser(name, password);
    if (existUser) return this.regDataOf(regData, existUser);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const newUser = { hash, salt };
    this.db[name] = newUser;

    return this.regDataOf(regData, newUser);
  }

  getUserWithoutVerification(name: string): UserData | undefined {
    return this.db[name];
  }

  getUser(name: string, password: string): UserData | undefined | Error {
    const user = this.getUserWithoutVerification(name);
    if (user) {
      const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
      if (hash === user.hash) {
        return user;
      }

      return this.error('Invalid password');
    }

    return undefined;
  }

  deleteUser(name: string): void {
    delete this.db[name];
  }

  saveDb(): void {
    const data = JSON.stringify(this.db);
    fs.writeFileSync(this.dbPath, data);
    console.log('[UserDb]', 'The user database has been successfully saved');
  }

  regDataOf(regData: RegData, userOrError: UserData | Error): RegData {
    const errData =
      userOrError instanceof Error
        ? {
            error: true,
            errorText: userOrError.message,
          }
        : {};

    return {
      ...regData,
      ...errData,
    };
  }

  private error(msg: string): Error {
    return new Error(msg);
  }
}

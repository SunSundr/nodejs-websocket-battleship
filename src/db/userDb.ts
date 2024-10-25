import * as fs from 'node:fs';
import path from 'node:path';
import * as crypto from 'crypto';
import { User, DbObj } from './types';

export class UserDb {
  private db: DbObj = {};
  private readonly dbPath: string;

  constructor() {
    this.dbPath = path.join(__dirname, 'db.json');
    console.log(this.dbPath);
    this.loadDb();
  }

  private loadDb() {
    try {
      const data = fs.readFileSync(this.dbPath, 'utf-8');
      this.db = JSON.parse(data);
    } catch (err) {
      this.db = {};
    }
  }

  public addUser(name: string, password: string): void {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    this.db[name] = { hash, salt };
  }

  public getUser(name: string, password: string): User | undefined {
    const user = this.db[name];
    if (user) {
      const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
      if (hash === user.hash) {
        return user;
      }
    }

    return undefined;
  }

  public deleteUser(name: string): void {
    delete this.db[name];
  }

  public saveDb(): void {
    const data = JSON.stringify(this.db);
    fs.writeFileSync(this.dbPath, data);
    console.log('[UserDb]', 'The user database has been successfully saved');
  }
}

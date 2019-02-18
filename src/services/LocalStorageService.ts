import { ServerServiceInterface } from "serendip";
import * as fs from "fs-extra";
import { Server } from "serendip";
export class LocalStorageService implements ServerServiceInterface {
  async start() {
    if (!fs.existsSync(this.path)) fs.writeJSONSync(this.path, {});
  }

  private path = Server.dir + "/.localStorage.json";
  private _storage: { [key: string]: any };
  public get storage() {
    if (this._storage) return this._storage;
    else {
      if (fs.existsSync(this.path)) {
        this._storage = fs.readJSONSync(this.path);
        return this._storage;
      } else return {};
    }
  }
  public set storage(v) {
    this._storage = v;
  }

  setItem(key, value) {
    this.storage[key] = value;
    fs.writeJSONSync(this.path, this.storage);
  }

  getItem(key) {
    return this.storage[key];
  }

  removeItem(key) {
    delete this.storage[key];
    fs.writeJSONSync(this.path, this.storage);

  }
  clear() {
    this.storage = {};
    fs.writeJSONSync(this.path, {});
  }
}

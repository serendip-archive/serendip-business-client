"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const serendip_1 = require("serendip");
class LocalStorageService {
    constructor() {
        this.path = serendip_1.Server.dir + "/.localStorage.json";
    }
    async start() {
        if (!fs.existsSync(this.path))
            fs.writeJSONSync(this.path, {});
    }
    get storage() {
        if (this._storage)
            return this._storage;
        else {
            if (fs.existsSync(this.path)) {
                this._storage = fs.readJSONSync(this.path);
                return this._storage;
            }
            else
                return {};
        }
    }
    set storage(v) {
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
exports.LocalStorageService = LocalStorageService;

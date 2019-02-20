"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class LocalStorageService {
    constructor() {
        this.storage = {};
    }
    static configure(opts) {
        LocalStorageService.options = opts;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (LocalStorageService.options.load)
                this.storage = yield LocalStorageService.options.load();
        });
    }
    setItem(key, value) {
        this.storage[key] = value;
        if (LocalStorageService.options.set)
            LocalStorageService.options.set(key, value);
    }
    getItem(key) {
        return this.storage[key];
    }
    removeItem(key) {
        delete this.storage[key];
        if (LocalStorageService.options.remove)
            LocalStorageService.options.remove(key);
    }
    clear() {
        this.storage = {};
        if (LocalStorageService.options.clear)
            LocalStorageService.options.clear();
    }
}
LocalStorageService.options = {};
exports.LocalStorageService = LocalStorageService;

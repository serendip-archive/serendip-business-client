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
class BusinessService {
    constructor(localStorageService) {
        this.localStorageService = localStorageService;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    get business() {
        if (this._business) {
            return this._business;
        }
        else if (this.localStorageService.getItem("business")) {
            return JSON.parse(this.localStorageService.getItem("business"));
        }
        return undefined;
    }
    set business(val) {
        this._business = val;
        this.localStorageService.setItem("business", JSON.stringify(val));
    }
}
exports.BusinessService = BusinessService;

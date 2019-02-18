"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BusinessService {
    constructor(localStorageService) {
        this.localStorageService = localStorageService;
    }
    async start() { }
    get business() {
        if (this._business) {
            return this._business;
        }
        else if (this.localStorageService.getItem("business")) {
            return JSON.parse(this.localStorageService.getItem("business"));
        }
    }
    set business(val) {
        this._business = val;
        this.localStorageService.setItem("business", JSON.stringify(val));
    }
}
exports.BusinessService = BusinessService;

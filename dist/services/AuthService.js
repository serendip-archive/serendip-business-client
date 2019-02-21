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
const _ = require("underscore");
const DataService_1 = require("./DataService");
class AuthService {
    constructor(httpClientService, localStorageService) {
        this.httpClientService = httpClientService;
        this.localStorageService = localStorageService;
        this.profileValid = false;
        this.loggedIn = false;
        this.profile = {};
    }
    static configure(options) {
        AuthService.options = options;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.token())) {
                const token = yield this.login({
                    username: AuthService.options.username,
                    password: AuthService.options.password
                });
                console.log("> AuthService got token", token);
            }
            else {
                console.log("> AuthService using token in localStorage", yield this.token());
            }
        });
    }
    get apiUrl() {
        return DataService_1.DataService.server;
    }
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            this.localStorageService.clear();
            // await IdbDeleteAllDatabases();
        });
    }
    token() {
        return __awaiter(this, void 0, void 0, function* () {
            let token;
            if (this.localStorageService.getItem("token")) {
                token = JSON.parse(this.localStorageService.getItem("token"));
            }
            if (token) {
                if (token.expires_at - Date.now() < 60000) {
                    token = yield this.refreshToken(token);
                }
            }
            if (!token) {
                this.localStorageService.removeItem("token");
            }
            // console.log('token()',token);
            if (token && token.access_token) {
                this.loggedIn = true;
                return token;
            }
            else {
                this.loggedIn = false;
                return undefined;
            }
        });
    }
    register(mobile, password) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClientService.request({
                method: "post",
                url: this.apiUrl + "/api/auth/register",
                json: {
                    username: mobile,
                    mobile: mobile,
                    password: password
                }
            });
        });
    }
    sendVerify(mobile) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClientService.request({
                method: "post",
                url: this.apiUrl + "/api/auth/sendVerifySms",
                json: {
                    mobile: mobile
                }
            });
        });
    }
    sendOneTimePassword(mobile, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject({ status: 0 });
                }, timeout || 3000);
                return this.httpClientService
                    .request({
                    method: "post",
                    url: this.apiUrl + "/api/auth/oneTimePassword",
                    json: {
                        mobile: mobile
                    }
                })
                    .then(res => {
                    resolve(res);
                })
                    .catch(err => {
                    reject(err);
                });
            });
        });
    }
    sendResetPasswordToken(mobile) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClientService.request({
                url: this.apiUrl + "/api/auth/sendResetPasswordToken",
                json: {
                    mobile: mobile
                }
            });
        });
    }
    verifyMobile(mobile, code) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClientService.request({
                method: "post",
                url: this.apiUrl + "/api/auth/verifyMobile",
                json: {
                    mobile: mobile,
                    code: code
                }
            });
        });
    }
    resetPassword(mobile, code, password, passwordConfirm) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClientService.request({
                url: this.apiUrl + "/api/auth/resetPassword",
                json: {
                    mobile: mobile,
                    code: code,
                    password: password,
                    passwordConfirm: passwordConfirm
                }
            });
        });
    }
    login(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const newToken = yield this.httpClientService.request({
                url: this.apiUrl + "/api/auth/token",
                method: "post",
                json: _.extend({
                    grant_type: "password"
                }, opts)
            });
            if (!newToken) {
                throw new Error("empty token");
            }
            console.log("newToken", newToken);
            this.loggedIn = true;
            this.localStorageService.setItem("token", JSON.stringify(newToken));
            return newToken;
        });
    }
    refreshToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newToken = yield this.httpClientService.request({
                    method: "post",
                    url: this.apiUrl + "/api/auth/refreshToken",
                    json: {
                        refresh_token: token.refresh_token,
                        access_token: token.access_token
                    }
                });
                this.localStorageService.setItem("token", JSON.stringify(newToken));
                return newToken;
            }
            catch (res) {
                if (res.status === 401 || res.status === 400) {
                    this.logout();
                }
                else {
                    return token;
                }
            }
        });
    }
}
AuthService.options = {
    username: "",
    password: ""
};
exports.AuthService = AuthService;

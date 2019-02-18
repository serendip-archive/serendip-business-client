"use strict";
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
    async start() {
        const token = await this.login({
            username: AuthService.options.username,
            password: AuthService.options.password
        });
        console.log("> AuthService got token", token);
    }
    get apiUrl() {
        return DataService_1.DataService.server;
    }
    async logout() {
        this.localStorageService.clear();
        // await IdbDeleteAllDatabases();
        window.location.reload();
    }
    async token() {
        let token;
        if (this.localStorageService.getItem("token")) {
            token = JSON.parse(this.localStorageService.getItem("token"));
        }
        if (token) {
            if (token.expires_at - Date.now() < 60000) {
                token = await this.refreshToken(token);
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
            throw new Error("cant get token");
        }
    }
    async register(mobile, password) {
        return this.httpClientService.request({
            method: "post",
            url: this.apiUrl + "/api/auth/register",
            json: {
                username: mobile,
                mobile: mobile,
                password: password
            }
        });
    }
    async sendVerify(mobile) {
        return this.httpClientService.request({
            method: "post",
            url: this.apiUrl + "/api/auth/sendVerifySms",
            json: {
                mobile: mobile
            }
        });
    }
    async sendOneTimePassword(mobile, timeout) {
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
    }
    async sendResetPasswordToken(mobile) {
        return this.httpClientService.request({
            url: this.apiUrl + "/api/auth/sendResetPasswordToken",
            json: {
                mobile: mobile
            }
        });
    }
    async verifyMobile(mobile, code) {
        return this.httpClientService.request({
            method: "post",
            url: this.apiUrl + "/api/auth/verifyMobile",
            json: {
                mobile: mobile,
                code: code
            }
        });
    }
    async resetPassword(mobile, code, password, passwordConfirm) {
        return this.httpClientService.request({
            url: this.apiUrl + "/api/auth/resetPassword",
            json: {
                mobile: mobile,
                code: code,
                password: password,
                passwordConfirm: passwordConfirm
            }
        });
    }
    async login(opts) {
        const newToken = await this.httpClientService.request({
            url: this.apiUrl + "/api/auth/token",
            method: "post",
            json: _.extend({
                grant_type: "password"
            }, opts)
        });
        if (!newToken) {
            throw new Error("empty token");
        }
        // console.log("newToken", newToken);
        this.loggedIn = true;
        this.localStorageService.setItem("token", JSON.stringify(newToken));
        return newToken;
    }
    async refreshToken(token) {
        try {
            const newToken = await this.httpClientService.request({
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
    }
}
AuthService.options = {
    username: "",
    password: ""
};
exports.AuthService = AuthService;

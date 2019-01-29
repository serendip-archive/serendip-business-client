"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serendip_1 = require("serendip");
const events_1 = require("events");
const _ = require("underscore");
class AuthService {
    constructor() {
        this.httpClientService = serendip_1.Server.services["HttpClientService"];
    }
    static configure(options) {
        AuthService.options = _.extend(AuthService.options, options);
    }
    async start() { }
}
AuthService.options = {};
AuthService.dependencies = ["HttpClientService"];
AuthService.events = new events_1.EventEmitter();
exports.AuthService = AuthService;

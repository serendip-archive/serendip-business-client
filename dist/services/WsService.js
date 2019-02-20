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
const DataService_1 = require("./DataService");
class WsService {
    constructor(authService, dataService) {
        this.authService = authService;
        this.dataService = dataService;
    }
    static configure(opts) {
        WsService.options = opts;
    }
    newSocket(path, retry, maxRetry) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!path) {
                path = "/";
            }
            let tries = 1;
            if (!maxRetry) {
                maxRetry = 3000;
            }
            return new Promise((resolve, reject) => {
                this.initiateSocket(path)
                    .then(ws => {
                    resolve(ws);
                })
                    .catch(ev => {
                    console.log(`newSocket at ${path} initiate ended with catch`, ev.message);
                    if (retry && maxRetry > 1) {
                        console.log(`> WsService: trying again for newSocket at ${path} in 3sec`);
                        const tryTimer = setInterval(() => {
                            tries++;
                            this.initiateSocket(path)
                                .then(ws => {
                                clearInterval(tryTimer);
                                return resolve(ws);
                            })
                                .catch(ev2 => {
                                console.log(`newSocket at ${path} initiate ended with catch`, ev2.message);
                                if (maxRetry && tries === maxRetry) {
                                    reject(ev2);
                                }
                                else {
                                    console.log(`Trying again for newSocket at ${path} in 3sec`);
                                }
                            });
                        }, 3000);
                    }
                    else {
                        reject(ev);
                    }
                });
            });
        });
    }
    initiateSocket(path) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let wsConnection;
            const wsAddress = path.indexOf("://") !== -1
                ? path
                : DataService_1.DataService.server
                    .replace("http:", "ws:")
                    .replace("https:", "wss:") + (path || "");
            try {
                wsConnection = new WsService.options.webSocketClass(wsAddress);
            }
            catch (error) {
                reject(error);
            }
            wsConnection.onclose = ev => {
                reject(ev);
            };
            wsConnection.onerror = ev => {
                reject(ev);
            };
            wsConnection.onmessage = (ev) => {
                // FIXME: saw this method fired twice. find out why;
                // console.log("ws initiate onmessage", ev);
                if (ev.data === "authenticated") {
                    resolve(wsConnection);
                }
            };
            const token = yield this.authService.token();
            wsConnection.onopen = ev => {
                wsConnection.send(token.access_token);
                // setInterval(() => {
                //   if (wsConnection.readyState == wsConnection.OPEN)
                //     wsConnection.send(new Date().toString());
                // }, 2000);
            };
        }));
    }
}
exports.WsService = WsService;

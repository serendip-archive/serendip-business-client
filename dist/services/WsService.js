"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DataService_1 = require("./DataService");
const ws = require("ws");
class WsService {
    constructor(authService, dataService) {
        this.authService = authService;
        this.dataService = dataService;
    }
    async newSocket(path, retry, maxRetry) {
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
    }
    initiateSocket(path) {
        console.log("request for websocket to", path);
        return new Promise(async (resolve, reject) => {
            let wsConnection;
            const wsAddress = path.indexOf("://") !== -1
                ? path
                : DataService_1.DataService.server
                    .replace("http:", "ws:")
                    .replace("https:", "wss:") + (path || "");
            try {
                if (typeof WebSocket != "undefined")
                    wsConnection = new WebSocket(wsAddress);
                else
                    wsConnection = new ws(wsAddress);
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
            const token = await this.authService.token();
            wsConnection.onopen = ev => {
                wsConnection.send(token.access_token);
                // setInterval(() => {
                //   if (wsConnection.readyState == wsConnection.OPEN)
                //     wsConnection.send(new Date().toString());
                // }, 2000);
            };
        });
    }
}
exports.WsService = WsService;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Request = require("request");
class HttpClientService {
    async start() { }
    request(url, opts) {
        return new Promise((resolve, reject) => {
            Request(url, opts, (err, res, body) => {
                if (err)
                    return reject(err);
                else
                    resolve(res);
            });
        });
    }
}
HttpClientService.dependencies = [];
exports.HttpClientService = HttpClientService;

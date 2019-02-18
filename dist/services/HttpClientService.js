"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Request = require("request");
class HttpClientService {
    async start() { }
    request(opts, returns) {
        return new Promise((resolve, reject) => {
            Request(opts, (err, res, body) => {
                if (err)
                    return reject(err);
                if (returns == "response")
                    return resolve(res);
                return resolve(body);
            });
        });
    }
}
exports.HttpClientService = HttpClientService;

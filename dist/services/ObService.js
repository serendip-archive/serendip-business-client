"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const rxjs_1 = require("rxjs");
class ObService {
    constructor() {
        this.eventEmitter = new events_1.EventEmitter();
    }
    listen(channel) {
        return new rxjs_1.Observable(obServer => {
            this.eventEmitter.on(channel, (eventType, model) => {
                obServer.next({ eventType, model });
            });
        });
    }
    publish(channel, eventType, model) {
        this.eventEmitter.emit(channel, eventType, model);
    }
}
exports.ObService = ObService;

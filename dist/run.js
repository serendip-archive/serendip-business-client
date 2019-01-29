"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serendip_1 = require("serendip");
const AuthService_1 = require("./services/AuthService");
const HttpClientService_1 = require("./services/HttpClientService");
serendip_1.start({
    services: [AuthService_1.AuthService, HttpClientService_1.HttpClientService],
    httpPort: null,
    cpuCores: 1
})
    .then(() => {
    console.log("Server workers started successfully!");
})
    .catch(err => {
    console.error("\nServer start error \n");
    console.error(err);
    process.exit();
});

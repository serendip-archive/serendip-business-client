"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serendip_1 = require("serendip");
const AuthService_1 = require("./services/AuthService");
const BusinessService_1 = require("./services/BusinessService");
const DataService_1 = require("./services/DataService");
const HttpClientService_1 = require("./services/HttpClientService");
const dotenv = require("dotenv");
const ObService_1 = require("./services/ObService");
const LocalStorageService_1 = require("./services/LocalStorageService");
const serendip_2 = require("serendip");
const WsService_1 = require("./services/WsService");
const path_1 = require("path");
dotenv.config();
serendip_1.DbService.configure({
    providers: {
        Mongodb: {
            object: new serendip_1.MongodbProvider(),
            options: {
                mongoDb: process.env["db.mongoDb"],
                mongoUrl: process.env["db.mongoUrl"],
                authSource: process.env["db.authSource"],
                user: process.env["db.user"],
                password: process.env["db.password"]
            }
        }
    }
});
AuthService_1.AuthService.configure({
    username: "09128917370",
    password: "0214470"
});
serendip_2.Server.dir = path_1.join(__dirname, "..");
serendip_1.start({
    services: [
        LocalStorageService_1.LocalStorageService,
        serendip_1.DbService,
        WsService_1.WsService,
        ObService_1.ObService,
        BusinessService_1.BusinessService,
        DataService_1.DataService,
        AuthService_1.AuthService,
        HttpClientService_1.HttpClientService,
        class TestService {
            constructor(businessService, dataService, dbService, wsService) {
                this.businessService = businessService;
                this.dataService = dataService;
                this.dbService = dbService;
                this.wsService = wsService;
            }
            async start() {
                var businesses = [].concat(await this.dataService.businesses());
                console.log("> businesses: \n", businesses.map(p => `\t ${p._id} ${p.title}\n`).join(""));
                this.businessService.business = businesses[0];
                let socket = await this.wsService.newSocket("/entity", true);
                socket.onclose = async (closeEv) => {
                    socket = null;
                    socket = await this.wsService.newSocket("/storage", true);
                };
                socket.onmessage = ev => {
                    console.log(new Date().toTimeString() + " > socket received:\n\t", ev.data);
                };
                await this.dataService.pullCollections(name => {
                    console.log(name);
                });
            }
        }
    ],
    cpuCores: 1
})
    .then(() => {
    console.log(" > client started successfully!");
})
    .catch(err => {
    console.error("\nclient start error \n");
    console.error(err);
    process.exit();
});

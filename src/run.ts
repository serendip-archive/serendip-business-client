import { DbService, MongodbProvider, start } from "serendip";

import { AuthService } from "./services/AuthService";
import { BusinessService } from "./services/BusinessService";
import { DataService } from "./services/DataService";
import { HttpClientService } from "./services/HttpClientService";
import * as dotenv from "dotenv";
import { ObService } from "./services/ObService";
import { LocalStorageService } from "./services/LocalStorageService";
import { WebSocketService, Server } from "serendip";
import { WsService } from "./services/WsService";
import { join } from "path";

dotenv.config();

DbService.configure({
  providers: {
    Mongodb: {
      object: new MongodbProvider(),
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

AuthService.configure({
  username: "09128917370",
  password: "0214470"
});
Server.dir = join(__dirname, "..");
start({
  services: [
    LocalStorageService,
    DbService,
    WsService,
    ObService,
    BusinessService,
    DataService,
    AuthService,
    HttpClientService,
    class TestService {
      constructor(
        private businessService: BusinessService,
        private dataService: DataService,
        private dbService: DbService,
        private wsService: WsService
      ) {}
      async start() {
        var businesses = [].concat(await this.dataService.businesses());

        console.log(
          "> businesses: \n",
          businesses.map(p => `\t ${p._id} ${p.title}\n`).join("")
        );

        this.businessService.business = businesses[0];

        let socket = await this.wsService.newSocket("/entity", true);

        socket.onclose = async closeEv => {
          socket = null;
          socket = await this.wsService.newSocket("/storage", true);
        };
        socket.onmessage = ev => {
          console.log(
            new Date().toTimeString() + " > socket received:\n\t",
            ev.data
          );
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

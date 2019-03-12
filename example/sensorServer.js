var sbc = require("../dist");
var _ = require("underscore");
var smp = require("serendip-mongodb-provider");

var path = require("path");

var WS = require("ws");
var fs = require("fs-extra");

const localStoragePath = path.join(__dirname, "..", ".localStorage.json");

sbc.LocalStorageService.configure({
  clear: () => fs.writeJSON(localStoragePath, {}),
  load: async () => {
    if (!(await fs.pathExists(localStoragePath)))
      await fs.writeJSON(localStoragePath, {});
    return fs.readJSON(localStoragePath);
  },
  get: async key => (await fs.readJSON(localStoragePath))[key],
  set: async (key, value) => {
    const storage = await fs.readJSON(localStoragePath);
    storage[key] = value;
    await fs.writeJSON(localStoragePath, storage);
  },
  remove: async key => {
    const storage = await fs.readJSON(localStoragePath);
    delete storage[key];
    await fs.writeJSON(localStoragePath, storage);
  },
  save: storage => fs.writeJSON(localStoragePath, storage)
});

sbc.DbService.configure({
  defaultProvider: "Mongodb",
  providers: {
    Mongodb: {
      object: new smp.MongodbProvider(),
      options: {
        mongoDb: "serendip_client",
        mongoUrl: "?",
        authSource: "admin",
        user: "?",
        password: "?"
      }
    }
  }
});

sbc.WsService.configure({
  webSocketClass: WS
});

sbc.AuthService.configure({
  username: "?",
  password: "?"
});

new sbc.Client(
  {
    logging: "info",
    services: [
      sbc.LocalStorageService,
      sbc.DbService,
      sbc.WsService,
      sbc.BusinessService,
      sbc.DataService,
      sbc.AuthService,
      sbc.HttpClientService,
      class TestService {
        constructor(businessService, dataService, dbService, wsService) {
          (async () => {
            var socket = await wsService.newSocket("/entity", true);

            socket.onmessage = ev => {
              // FIXME: saw this method fired twice. find out why;
              // console.log("ws initiate onmessage", ev);
              console.log(JSON.parse(ev.data));
            };
          })();
        }
        async start() {}
      }
    ]
  },
  error => {
    console.log(error);
  }
);

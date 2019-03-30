import * as JsZip from "jszip";
import {
  ReportInterface,
  EntityModel,
  BusinessModel,
  ProfileModel
} from "serendip-business-model";
import * as utils from "serendip-utility";
import * as _ from "underscore";

import { AuthService } from "./AuthService";
import {} from "ndx";
import ObjectID from "bson-objectid";

import { BusinessService } from "./BusinessService";
import { HttpClientService } from "./HttpClientService";
import { LocalStorageService } from "./LocalStorageService";
import { ClientServiceInterface, Client } from "../Client";
import { DbService } from "./DbService";

export interface DataRequestInterface {
  method: string | "POST" | "GET";
  path: string;
  model?: any;
  raw?: boolean;
  retry?: boolean;
  host?: string;
  modelName?: string;

  timeout?: number;
}

export class DataService implements ClientServiceInterface {
  static options: any = {};
  static configure(opts) {
    DataService.options = opts;
  }
  async start() {
    if (Client.services.dbService) this.dbService = Client.services.dbService;


    try {
    this.businessService.businesses = await this.businesses();
      
    } catch (error) {
      
    }

    console.log(
      "> DataService loaded businesses: \n",
      this.businessService.businesses
        .map(p => `\t ${p._id} ${p.title}\n`)
        .join("")
    );

    if (DataService.options && DataService.options.business) {
      this.businessService.business = _.findWhere(
        this.businessService.businesses,
        { _id: DataService.options.business }
      );
    } else if (
      this.businessService.businesses &&
      this.businessService.businesses.length > 0
    )
      this.businessService.business = this.businessService.businesses[0];

    if (!this.businessService.business) {
      throw new Error("business invalid or not set");
    }

    if (this.businessService.business)
      console.log(
        "> DataService default business _id: " +
          this.businessService.business._id
      );
    else
      throw "DataService could not work without default business. provide one via DataService.configure method or connect to the server";
  }
  // public collectionsTextIndex: DocumentIndex[];

  static get dependencies() {
    if (
      (Client.opts.services as any).filter(p => p.name == "DbService").length ==
      1
    )
      return ["DbService"];
    return [];
  }
  collectionsTextIndexCache: { [key: string]: any } = {};

  commonEnglishWordsIndexCache: any;

  serversToSelect = [
    { label: "سرور ایران", value: "https://business.serendip.ir" },
    { label: "سرور ابری آلمان", value: "https://business.serendip.cloud" },
    { label: "سرور ابری لیارا", value: "https://serendip.liara.run" },
    { label: "سرور باکس سرندیپ", value: "box" },
    { label: "سرور توسعه کلاد", value: "http://dev.serendip.cloud:2040" },
    { label: "سرور توسعه محلی", value: "http://localhost:2040" }
  ];

  static server: string = "https://business.serendip.cloud";

  constructor(
    private localStorageService: LocalStorageService,
    private authService: AuthService,
    private httpClientService: HttpClientService,
    private dbService: DbService,
    private businessService: BusinessService
  ) {
    //  this.setCurrentServer();
  }

  // decrypt(model: EntityModel) {
  //   if (!model._aes) {
  //     return model;
  //   }

  //   try {
  //     const aesKey = cryptico.decrypt(
  //       model._aes,
  //       this.businessService.privateKey
  //     ).plaintext;

  //     const dAesCtr = new aesjs.ModeOfOperation.ctr(
  //       aesjs.utils.utf8.toBytes(aesKey),
  //       new aesjs.Counter(5)
  //     );
  //     const decryptedModel = JSON.parse(
  //       aesjs.utils.utf8.fromBytes(
  //         dAesCtr.decrypt(aesjs.utils.hex.toBytes(model._hex))
  //       )
  //     );

  //     delete model["_aes"];
  //     delete model["_hex"];

  //     return _.extend(model, decryptedModel);
  //   } catch (error) {
  //     console.log(error);
  //   }

  //   return model;
  // }

  async businesses(): Promise<BusinessModel[]> {
    return await this.request({
      method: "get",
      retry: false,
      path: "/api/business/list"
    });
  }
  async setDefaultBusiness(businessId) {
    try {
      this.businessService.business = _.findWhere(await this.businesses(), {
        _id: businessId
      });
    } catch (error) {}
  }
  setCurrentServer(srv?) {
    let lsServer = this.localStorageService.getItem("server");

    if (lsServer) {
      if (this.serversToSelect.filter(p => p.value === lsServer).length === 0) {
        lsServer = null;
      }
    }

    if (srv) {
      lsServer = srv;
    } else {
      if (!lsServer || (lsServer.indexOf && lsServer.indexOf("http") !== 0)) {
        lsServer = "http://localhost:2040";

        // switch (location.hostname) {
        //   case "serendip.ir":
        //     lsServer = "https://business.serendip.ir";
        //     break;
        //   case "localhost":
        //     lsServer = "http://localhost:2040";
        //     break;
        //   default:
        //     lsServer = "https://business.serendip.cloud";
        //     break;
        // }
      }
    }

    this.localStorageService.setItem("server", lsServer);
  }

  async profile(): Promise<ProfileModel> {
    let profileLs = this.localStorageService.getItem("profile");

    try {
      const res = await this.request({ path: "/api/profile", method: "get" });
      if (res) {
        profileLs = res;
        this.localStorageService.setItem("profile", JSON.stringify(profileLs));
      }
    } catch (error) {
      if (profileLs) {
        return JSON.parse(profileLs);
      } else {
        throw error;
      }
    }
  }
  public request(opts: DataRequestInterface): Promise<any> {
    return new Promise(async (resolve, reject) => {
      setTimeout(() => {
        reject("timeout");
      }, opts.timeout || 30000);

      opts.method = opts.method.trim().toUpperCase();

      let result = {};

      if (!opts.model) {
        opts.model = {};
      }

      if (!opts.host) {
        opts.host = DataService.server;
      }

      try {
        const token = await this.authService.token();

        if (!token)
          return reject(
            "serendip business client got no token to send authenticated request to " +
              opts.path
          );

        if (!opts.model._business) {
          if (this.businessService.business) {
            opts.model._business = this.businessService.business._id;
          }
        }

        const headers = {
          Authorization: "Bearer " + token.access_token
          // clientid: environment.clientId
        };

        // if (opts.raw) {
        //   options.responseType = "blob";
        //   options.observe = "response";
        // }

        // console.log(
        //   "HTTP " + opts.method.toUpperCase() + " Request to",
        //   opts.host + opts.path
        // );

        result = await this.httpClientService.request(
          {
            method: opts.method,
            json: opts.model,
            encoding: opts.raw ? null : "utf8",
            url:
              opts.host +
              opts.path +
              (opts.model && opts.method == "GET"
                ? "?" + utils.querystring.fromObject(opts.model)
                : ""),
            headers
          },
          opts.raw ? "response" : "body"
        );
      } catch (error) {
        if (error.status === 401) {
          this.authService.logout();
        }

        if (opts.retry) {
          // TODO: add request to push collection

          return resolve();
        } else {
          return reject(error);
        }
      }

      try {
        result = JSON.parse(result as any);
      } catch {}
      resolve(result);
    });
  }
  public async zip<A>(
    controller: string,
    from?: number,
    to?: number
  ): Promise<A[]> {
    const res: any = await this.request({
      method: "POST",
      timeout: 60000,
      path: `/api/entity/${controller}/zip`,
      model: {
        from: from,
        to: to
      },
      raw: true
    });

    const data = res.body;
    if (!data) {
      return [];
    }

    const zip = await JsZip.loadAsync(data, {
      base64: false,
      checkCRC32: true
    });

    const unzippedText: any = await zip.file("data.json").async("text");

    const unzippedArray = JSON.parse(unzippedText);

    return unzippedArray;
  }

  async list<A>(
    controller: string,
    skip?,
    limit?,
    offline?: boolean
  ): Promise<EntityModel[]> {
    if (offline) {
      if (!this.dbService)
        throw new Error(
          "DbService not configured for serendip business client to provide offline data listing"
        );
      const collection = await this.dbService.collection(controller);
      let data = await collection.find();

      if (skip && limit) {
        return _.take(_.rest(data, skip), limit);
      }

      if (!skip && limit) {
        return _.take(data, limit);
      }

      if (skip && !limit) {
        return _.rest(data, skip);
      }

      return data;
    } else {
      try {
        return await this.request({
          method: "POST",
          path: `/api/entity/${controller}/list`,
          timeout: 1000,
          model: {
            skip: skip,
            limit: limit
          }
        });
      } catch (error) {
        if (!offline) {
          return await this.list(controller, skip, limit, true);
        }
      }
    }
  }

  async search<A>(
    controller: string,
    query: string,
    take: number,
    properties: string[],
    propertiesSearchMode: string,
    offline?: boolean
  ): Promise<any> {
    if (offline) {
      const collection = await this.dbService.collection(controller);

      const data = await collection.find();
      const result = [];

      await Promise.all(
        _.map(data, model => {
          return new Promise(async (resolve, reject) => {
            const modelText = JSON.stringify(model);
            if (modelText.indexOf(query) !== -1) {
              result.push(model);
            }

            resolve();
          });
        })
      );

      return _.take(result, take);
    } else {
      try {
        return await this.request({
          method: "POST",
          path: `/api/entity/${controller}/search`,
          model: {
            properties,
            propertiesSearchMode,
            take: take,
            query: query
          },
          timeout: 3000,
          retry: false
        });
      } catch (error) {
        if (!offline) {
          return await this.search(
            controller,
            query,
            take,
            properties,
            propertiesSearchMode,
            true
          );
        } else {
          throw error;
        }
      }
    }
  }

  async count(controller: string, offline?: boolean): Promise<number> {
    if (offline) {
      if (!this.dbService)
        throw new Error(
          "DbService not configured for serendip business client to provide offline data counting"
        );
      const collection = await this.dbService.collection(controller);

      const data = await collection.find();
      return data.length;
    } else {
      try {
        return await this.request({
          method: "POST",
          timeout: 1000,
          path: `/api/entity/${controller}/count`
        });
      } catch (error) {
        if (!offline) {
          return await this.count(controller, true);
        }
      }
    }
  }

  async details(
    controller: string,
    _id: string,
    offline?: boolean,
    error?: any
  ): Promise<EntityModel> {
    if (offline) {
      const collection = await this.dbService.collection(controller);

      const data = await collection.find({ _id });
      if (data[0]) {
        return data[0];
      } else {
        throw error || new Error("entity not found " + _id);
      }
    } else {
      try {
        const result = await this.request({
          method: "POST",

          path: `/api/entity/${controller}/details`,
          model: { _id }
        });

        return result;
      } catch (error) {
        console.log("trying details offline");
        if (!offline) {
          return this.details(controller, _id, true, error);
        } else {
          throw error;
        }
      }
    }
  }

  changes(
    controller: string,
    from?: number,
    to?: number,
    _id?: string
  ): Promise<any> {
    const query = {
      _id,
      "model._entity": controller,
      "model._vdate": { $gt: from || 0, $lt: to || Date.now() }
    };

    return this.request({
      method: "POST",
      path: `/api/entity/changes`,
      timeout: 60000,
      model: query,
      retry: false
    });
  }

  countChanges(
    controller: string,
    from?: number,
    to?: number,
    _id?: string
  ): Promise<any> {
    const query = {
      _id,
      "model._entity": controller,
      "model._vdate": { $gt: from || 0, $lt: to || Date.now() },
      count: true
    };

    return this.request({
      method: "POST",
      path: `/api/entity/changes`,
      timeout: 60000,
      model: query
    });
  }

  async updateIDB(model: EntityModel, controller: string) {
    const collection = await this.dbService.collection(controller);

    await collection.updateOne(model);
  }

  async insert(controller: string, model: EntityModel): Promise<EntityModel> {
    if (!model._id) {
      model._id = new ObjectID().str;
    }

    if (model._access == "encrypted") {
    }

    await this.updateIDB(model, controller);
    //  this.obService.publish(controller, "insert", model);
    const result = await this.request({
      method: "POST",
      path: `/api/entity/${controller}/insert`,
      timeout: 1000,
      model: model,
      retry: true
    });

    return result;
  }

  async update(controller: string, model: EntityModel): Promise<EntityModel> {
    if (!model._id) {
      model._id = new ObjectID().str;
    }

    await this.updateIDB(model, controller);

    // this.obService.publish(controller, "update", model);

    await this.request({
      method: "POST",
      path: `/api/entity/${controller}/update`,
      model: model,
      retry: true
    });
    return model;
  }

  async delete(controller: string, _id: string): Promise<EntityModel> {
    console.log("delete", controller, _id);

    let model = { _id: _id };

    const collection = await this.dbService.collection(controller);

    try {
      await collection.deleteOne(_id);
    } catch (error) {}

    //   this.obService.publish(controller, "delete", model);

    console.log("model to delete", model);
    await this.request({
      method: "POST",
      path: `/api/entity/${controller}/delete`,
      model: model,
      retry: true
    });

    return model;
  }

  public async pullCollection(collection) {
    const dbCollection = await this.dbService.collection<any>(collection);
    const pullStore = await this.dbService.collection<any>("pull");

    let lastSync = 0;

    try {
      lastSync = (await pullStore.find({ collection }))
        .map(p => p.date)
        .sort((a, b) => b - a)[0];
    } catch (e) {
      console.log(e);
    }

    if (lastSync) {
      // TODO Delete removed items
    }

    let changes;
    let changesCount;

    changesCount = await this.countChanges(collection, lastSync, Date.now());

    if (!changesCount) {
      return;
    }

    changes = await this.changes(collection, lastSync, Date.now());

    if (changes) {
      if (changes.deleted.length > 0) {
        for (const id of changes.deleted) {
          try {
            await dbCollection.deleteOne(id);
          } catch (error) {
            console.log("error in deleting entity from db", id, error);
          }
        }
      }
    }

    console.warn(
      "changes count for " +
        collection +
        " is " +
        changesCount +
        " since " +
        lastSync,
      changes
    );

    const newData = await this.zip<EntityModel>(
      collection,
      lastSync,
      Date.now()
    );

    for (const item of newData) {
      await dbCollection.updateOne(item);
    }

    await pullStore.insertOne({
      date: Date.now(),
      changes,
      collection
    });
  }

  public pushCollections() {
    return new Promise(async (resolve, reject) => {
      return resolve();
      // const store = await this.idbService.syncIDB("push");
      // const keys = await store.keys();

      // const pushes = _.map(keys, key => {
      //   return {
      //     key: key,
      //     promise: new Promise(async (_resolve, _reject) => {
      //       const pushModel = await store.get(key);
      //       await this.request(pushModel.opts);
      //       _resolve();
      //     })
      //   };
      // });

      // const runInSeries = index => {
      //   const pushModel: any = pushes[index];
      //   pushModel.promise
      //     .then(() => {
      //       store.delete(pushModel.key);
      //       index++;

      //       if (index === pushes.length) {
      //         resolve();
      //       } else {
      //         runInSeries(index);
      //       }
      //     })
      //     .catch(e => {
      //       reject();
      //     });
      // };

      // if (pushes.length > 0) {
      //   runInSeries(0);
      // } else {
      //   resolve();
      // }
    });
  }

  public async pullCollections(onCollectionSync?: Function) {
    const baseCollections = ["dashboard", "entity", "form", "report"];
    // FormsSchema.forEach(schema => {
    //   if (schema.entityName) {
    //     if (collections.indexOf(schema.entityName) === -1) {
    //       collections.push(schema.entityName);
    //     }
    //   }
    // });
    // ReportsSchema.forEach(schema => {
    //   if (schema.entityName) {
    //     if (collections.indexOf(schema.entityName) === -1) {
    //       collections.push(schema.entityName);
    //     }
    //   }
    // });

    for (const collection of baseCollections) {
      await this.pullCollection(collection);
    }
    const entityCollections = (await this.list("entity"))
      // .filter(p => p.offline)
      .map(p => p.name);

    for (const collection of entityCollections) {
      await this.pullCollection(collection);
    }
  }

  // public async indexCollections() {
  //   await promiseSerial(
  //     SearchSchema.map(schema => {
  //       return () =>
  //         new Promise(async (resolve, reject) => {
  //           const docIndex = new DocumentIndex({
  //             filter: str => {
  //               return str;
  //             }
  //           });
  //           const docs = await this.list(schema.entityName, 0, 0, true);

  //           schema.fields.forEach(field => {
  //             docIndex.addField(field.name, field.opts);
  //           });

  //           docs.forEach(doc => {
  //             docIndex.add(doc._id, doc);
  //           });

  //           this.collectionsTextIndexCache[schema.entityName] = docIndex;

  //           resolve();
  //         });
  //     }),
  //     { parallelize: 1 }
  //   );
  // }

  // public async indexCommonEnglishWords() {
  //   const words =
  //     (await this.http
  //       .get<string[]>("assets/data/common-words.json")
  //       .toPromise()) || [];

  //   const docIndex = new Index();

  //   docIndex.addField("value");

  //   words.forEach(w => {
  //     docIndex.add(w, { value: w });
  //   });

  //   this.commonEnglishWordsIndexCache = docIndex;
  // }
  public async sync() {
    await this.pushCollections();

    await this.pullCollections();

    // await this.indexCollections();

    //  await this.indexCommonEnglishWords();
  }
}

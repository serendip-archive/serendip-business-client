"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const JsZip = require("jszip");
const utils = require("serendip-utility");
const _ = require("underscore");
const bson_objectid_1 = require("bson-objectid");
class DataService {
    constructor(localStorageService, obService, authService, httpClientService, dbService, businessService) {
        this.localStorageService = localStorageService;
        this.obService = obService;
        this.authService = authService;
        this.httpClientService = httpClientService;
        this.dbService = dbService;
        this.businessService = businessService;
        this.collectionsTextIndexCache = {};
        this.serversToSelect = [
            { label: "سرور ایران", value: "https://business.serendip.ir" },
            { label: "سرور ابری آلمان", value: "https://business.serendip.cloud" },
            { label: "سرور ابری لیارا", value: "https://serendip.liara.run" },
            { label: "سرور باکس سرندیپ", value: "box" },
            { label: "سرور توسعه کلاد", value: "http://dev.serendip.cloud:2040" },
            { label: "سرور توسعه محلی", value: "http://localhost:2040" }
        ];
        this.setCurrentServer();
    }
    async start() { }
    async businesses() {
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
        }
        catch (error) { }
    }
    setCurrentServer(srv) {
        let lsServer = this.localStorageService.getItem("server");
        if (lsServer) {
            if (this.serversToSelect.filter(p => p.value === lsServer).length === 0) {
                lsServer = null;
            }
        }
        if (srv) {
            lsServer = srv;
        }
        else {
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
    async profile() {
        let profileLs = this.localStorageService.getItem("profile");
        try {
            const res = await this.request({ path: "/api/profile", method: "get" });
            if (res) {
                profileLs = res;
                this.localStorageService.setItem("profile", JSON.stringify(profileLs));
            }
        }
        catch (error) {
            if (profileLs) {
                return JSON.parse(profileLs);
            }
            else {
                throw error;
            }
        }
    }
    request(opts) {
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
                result = await this.httpClientService.request({
                    method: opts.method,
                    json: opts.model,
                    encoding: opts.raw ? null : "utf8",
                    url: opts.host +
                        opts.path +
                        (opts.model && opts.method == "GET"
                            ? "?" + utils.querystring.fromObject(opts.model)
                            : ""),
                    headers
                }, opts.raw ? "response" : "body");
            }
            catch (error) {
                console.warn("request error", opts, error);
                if (error.status === 401) {
                    this.authService.logout();
                }
                if (opts.retry) {
                    // TODO: add request to push collection
                    return resolve();
                }
                else {
                    return reject(error);
                }
            }
            try {
                result = JSON.parse(result);
            }
            catch (_a) { }
            resolve(result);
        });
    }
    async zip(controller, from, to) {
        const res = await this.request({
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
        const unzippedText = await zip.file("data.json").async("text");
        const unzippedArray = JSON.parse(unzippedText);
        return unzippedArray;
    }
    async list(controller, skip, limit, offline) {
        if (offline) {
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
        }
        else {
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
            }
            catch (error) {
                if (!offline) {
                    return await this.list(controller, skip, limit, true);
                }
            }
        }
    }
    async search(controller, query, take, properties, propertiesSearchMode, offline) {
        if (offline) {
            const collection = await this.dbService.collection(controller);
            const data = await collection.find();
            const result = [];
            await Promise.all(_.map(data, model => {
                return new Promise(async (resolve, reject) => {
                    const modelText = JSON.stringify(model);
                    if (modelText.indexOf(query) !== -1) {
                        result.push(model);
                    }
                    resolve();
                });
            }));
            return _.take(result, take);
        }
        else {
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
            }
            catch (error) {
                if (!offline) {
                    return await this.search(controller, query, take, properties, propertiesSearchMode, true);
                }
                else {
                    throw error;
                }
            }
        }
    }
    async count(controller, offline) {
        if (offline) {
            const collection = await this.dbService.collection(controller);
            const data = await collection.find();
            return data.length;
        }
        else {
            try {
                return await this.request({
                    method: "POST",
                    timeout: 1000,
                    path: `/api/entity/${controller}/count`
                });
            }
            catch (error) {
                if (!offline) {
                    return await this.count(controller, true);
                }
            }
        }
    }
    async details(controller, _id, offline, error) {
        if (offline) {
            const collection = await this.dbService.collection(controller);
            const data = await collection.find({ _id });
            if (data[0]) {
                return data[0];
            }
            else {
                throw error;
            }
        }
        else {
            try {
                const result = await this.request({
                    method: "POST",
                    path: `/api/entity/${controller}/details`,
                    model: { _id }
                });
                return result;
            }
            catch (error) {
                console.log("trying details offline");
                if (!offline) {
                    return this.details(controller, _id, true, error);
                }
                else {
                    throw error;
                }
            }
        }
    }
    changes(controller, from, to, _id) {
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
    countChanges(controller, from, to, _id) {
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
    async updateIDB(model, controller) {
        const collection = await this.dbService.collection(controller);
        await collection.updateOne({
            model
        });
    }
    async insert(controller, model) {
        if (!model._id) {
            model._id = new bson_objectid_1.default().str;
        }
        const result = await this.request({
            method: "POST",
            path: `/api/entity/${controller}/insert`,
            timeout: 1000,
            model: model,
            retry: true
        });
        await this.updateIDB(model, controller);
        this.obService.publish(controller, "insert", model);
        return result;
    }
    async update(controller, model) {
        if (!model._id) {
            model._id = new bson_objectid_1.default().str;
        }
        await this.updateIDB(model, controller);
        this.obService.publish(controller, "update", model);
        await this.request({
            method: "POST",
            path: `/api/entity/${controller}/update`,
            model: model,
            retry: true
        });
        return model;
    }
    async delete(controller, _id) {
        console.log("delete", controller, _id);
        let model = { _id: _id };
        const collection = await this.dbService.collection(controller);
        collection.deleteOne(_id);
        this.obService.publish(controller, "delete", model);
        console.log("model to delete", model);
        await this.request({
            method: "POST",
            path: `/api/entity/${controller}/delete`,
            model: model,
            retry: true
        });
        return model;
    }
    async pullCollection(collection) {
        const dbCollection = await this.dbService.collection(collection);
        const pullStore = await this.dbService.collection("pull");
        let lastSync = 0;
        try {
            lastSync = (await pullStore.find({ collection }))
                .map(p => p.date)
                .sort((a, b) => b - a)[0];
        }
        catch (e) {
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
                    }
                    catch (error) { }
                }
            }
        }
        console.warn("changes count for " +
            collection +
            " is " +
            changesCount +
            " since " +
            lastSync, changes);
        const newData = await this.zip(collection, lastSync, Date.now());
        for (const item of newData) {
            await dbCollection.updateOne(item);
        }
        await pullStore.insertOne({
            date: Date.now(),
            changes,
            collection
        });
    }
    pushCollections() {
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
    async pullCollections(onCollectionSync) {
        const baseCollections = ["dashboard", "entity", "form", "people", "report"];
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
    async sync() {
        await this.pushCollections();
        await this.pullCollections();
        // await this.indexCollections();
        //  await this.indexCommonEnglishWords();
    }
}
// public collectionsTextIndex: DocumentIndex[];
DataService.dependencies = [];
DataService.server = "http://localhost:2040";
exports.DataService = DataService;

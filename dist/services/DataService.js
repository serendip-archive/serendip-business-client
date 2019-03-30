"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const JsZip = require("jszip");
const utils = require("serendip-utility");
const _ = require("underscore");
const bson_objectid_1 = require("bson-objectid");
const Client_1 = require("../Client");
class DataService {
    constructor(localStorageService, authService, httpClientService, dbService, businessService) {
        this.localStorageService = localStorageService;
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
        //  this.setCurrentServer();
    }
    static configure(opts) {
        DataService.options = opts;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (Client_1.Client.services.dbService)
                this.dbService = Client_1.Client.services.dbService;
            try {
                this.businessService.businesses = yield this.businesses();
            }
            catch (error) {
            }
            console.log("> DataService loaded businesses: \n", this.businessService.businesses
                .map(p => `\t ${p._id} ${p.title}\n`)
                .join(""));
            if (DataService.options && DataService.options.business) {
                this.businessService.business = _.findWhere(this.businessService.businesses, { _id: DataService.options.business });
            }
            else if (this.businessService.businesses &&
                this.businessService.businesses.length > 0)
                this.businessService.business = this.businessService.businesses[0];
            if (!this.businessService.business) {
                throw new Error("business invalid or not set");
            }
            if (this.businessService.business)
                console.log("> DataService default business _id: " +
                    this.businessService.business._id);
            else
                throw "DataService could not work without default business. provide one via DataService.configure method or connect to the server";
        });
    }
    // public collectionsTextIndex: DocumentIndex[];
    static get dependencies() {
        if (Client_1.Client.opts.services.filter(p => p.name == "DbService").length ==
            1)
            return ["DbService"];
        return [];
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
    businesses() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.request({
                method: "get",
                retry: false,
                path: "/api/business/list"
            });
        });
    }
    setDefaultBusiness(businessId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.businessService.business = _.findWhere(yield this.businesses(), {
                    _id: businessId
                });
            }
            catch (error) { }
        });
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
    profile() {
        return __awaiter(this, void 0, void 0, function* () {
            let profileLs = this.localStorageService.getItem("profile");
            try {
                const res = yield this.request({ path: "/api/profile", method: "get" });
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
        });
    }
    request(opts) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
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
                const token = yield this.authService.token();
                if (!token)
                    return reject("serendip business client got no token to send authenticated request to " +
                        opts.path);
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
                result = yield this.httpClientService.request({
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
        }));
    }
    zip(controller, from, to) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.request({
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
            const zip = yield JsZip.loadAsync(data, {
                base64: false,
                checkCRC32: true
            });
            const unzippedText = yield zip.file("data.json").async("text");
            const unzippedArray = JSON.parse(unzippedText);
            return unzippedArray;
        });
    }
    list(controller, skip, limit, offline) {
        return __awaiter(this, void 0, void 0, function* () {
            if (offline) {
                if (!this.dbService)
                    throw new Error("DbService not configured for serendip business client to provide offline data listing");
                const collection = yield this.dbService.collection(controller);
                let data = yield collection.find();
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
                    return yield this.request({
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
                        return yield this.list(controller, skip, limit, true);
                    }
                }
            }
        });
    }
    search(controller, query, take, properties, propertiesSearchMode, offline) {
        return __awaiter(this, void 0, void 0, function* () {
            if (offline) {
                const collection = yield this.dbService.collection(controller);
                const data = yield collection.find();
                const result = [];
                yield Promise.all(_.map(data, model => {
                    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                        const modelText = JSON.stringify(model);
                        if (modelText.indexOf(query) !== -1) {
                            result.push(model);
                        }
                        resolve();
                    }));
                }));
                return _.take(result, take);
            }
            else {
                try {
                    return yield this.request({
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
                        return yield this.search(controller, query, take, properties, propertiesSearchMode, true);
                    }
                    else {
                        throw error;
                    }
                }
            }
        });
    }
    count(controller, offline) {
        return __awaiter(this, void 0, void 0, function* () {
            if (offline) {
                if (!this.dbService)
                    throw new Error("DbService not configured for serendip business client to provide offline data counting");
                const collection = yield this.dbService.collection(controller);
                const data = yield collection.find();
                return data.length;
            }
            else {
                try {
                    return yield this.request({
                        method: "POST",
                        timeout: 1000,
                        path: `/api/entity/${controller}/count`
                    });
                }
                catch (error) {
                    if (!offline) {
                        return yield this.count(controller, true);
                    }
                }
            }
        });
    }
    details(controller, _id, offline, error) {
        return __awaiter(this, void 0, void 0, function* () {
            if (offline) {
                const collection = yield this.dbService.collection(controller);
                const data = yield collection.find({ _id });
                if (data[0]) {
                    return data[0];
                }
                else {
                    throw error || new Error("entity not found " + _id);
                }
            }
            else {
                try {
                    const result = yield this.request({
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
        });
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
    updateIDB(model, controller) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = yield this.dbService.collection(controller);
            yield collection.updateOne(model);
        });
    }
    insert(controller, model) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!model._id) {
                model._id = new bson_objectid_1.default().str;
            }
            if (model._access == "encrypted") {
            }
            yield this.updateIDB(model, controller);
            //  this.obService.publish(controller, "insert", model);
            const result = yield this.request({
                method: "POST",
                path: `/api/entity/${controller}/insert`,
                timeout: 1000,
                model: model,
                retry: true
            });
            return result;
        });
    }
    update(controller, model) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!model._id) {
                model._id = new bson_objectid_1.default().str;
            }
            yield this.updateIDB(model, controller);
            // this.obService.publish(controller, "update", model);
            yield this.request({
                method: "POST",
                path: `/api/entity/${controller}/update`,
                model: model,
                retry: true
            });
            return model;
        });
    }
    delete(controller, _id) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("delete", controller, _id);
            let model = { _id: _id };
            const collection = yield this.dbService.collection(controller);
            try {
                yield collection.deleteOne(_id);
            }
            catch (error) { }
            //   this.obService.publish(controller, "delete", model);
            console.log("model to delete", model);
            yield this.request({
                method: "POST",
                path: `/api/entity/${controller}/delete`,
                model: model,
                retry: true
            });
            return model;
        });
    }
    pullCollection(collection) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbCollection = yield this.dbService.collection(collection);
            const pullStore = yield this.dbService.collection("pull");
            let lastSync = 0;
            try {
                lastSync = (yield pullStore.find({ collection }))
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
            changesCount = yield this.countChanges(collection, lastSync, Date.now());
            if (!changesCount) {
                return;
            }
            changes = yield this.changes(collection, lastSync, Date.now());
            if (changes) {
                if (changes.deleted.length > 0) {
                    for (const id of changes.deleted) {
                        try {
                            yield dbCollection.deleteOne(id);
                        }
                        catch (error) {
                            console.log("error in deleting entity from db", id, error);
                        }
                    }
                }
            }
            console.warn("changes count for " +
                collection +
                " is " +
                changesCount +
                " since " +
                lastSync, changes);
            const newData = yield this.zip(collection, lastSync, Date.now());
            for (const item of newData) {
                yield dbCollection.updateOne(item);
            }
            yield pullStore.insertOne({
                date: Date.now(),
                changes,
                collection
            });
        });
    }
    pushCollections() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
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
        }));
    }
    pullCollections(onCollectionSync) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this.pullCollection(collection);
            }
            const entityCollections = (yield this.list("entity"))
                // .filter(p => p.offline)
                .map(p => p.name);
            for (const collection of entityCollections) {
                yield this.pullCollection(collection);
            }
        });
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
    sync() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pushCollections();
            yield this.pullCollections();
            // await this.indexCollections();
            //  await this.indexCommonEnglishWords();
        });
    }
}
DataService.options = {};
DataService.server = "https://business.serendip.cloud";
exports.DataService = DataService;

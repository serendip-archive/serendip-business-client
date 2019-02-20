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
const _ = require("underscore");
const bson_objectid_1 = require("bson-objectid");
class ReportService {
    constructor(dataService) {
        this.dataService = dataService;
    }
    generate(report) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!report.fields) {
                report.fields = [];
            }
            if (!report.data) {
                yield this.dataService.pullCollection(report.entityName);
                let data = yield this.dataService.list(report.entityName, 0, 0, true);
                if (!data) {
                    data = [];
                }
                data = yield Promise.all(data.map((document, index) => {
                    return this.formatDocument(document, report.fields);
                }));
                const queriedData = [];
                yield Promise.all(data.map((document, index) => {
                    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                        const isMatch = yield this.documentMatchFieldQueries(document, report.fields);
                        if (isMatch) {
                            queriedData.push(document);
                        }
                        resolve();
                    }));
                }));
                report.data = queriedData;
                report.count = report.data.length;
                // report.formats = [
                //   {
                //     method: "javascript",
                //     options: {
                //       code: groupMethod.toString()
                //     }
                //   }
                //   // {
                //   //   method : 'groupByQueries',
                //   //   options : {
                //   //     queries : [{method : 'eq',}] as FieldQueryInterface[]
                //   //   }
                //   // }
                // ];
            }
            return report;
        });
    }
    queueFormatReport() {
        return new Promise((resolve, reject) => {
            this.formatReportQueue = bson_objectid_1.default.generate();
        });
    }
    wait(timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, timeout);
        });
    }
    formatReport(report, format) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.formatterBusy) {
                this.formatterBusy = true;
                // report = await this.generate(_.omit(report, "data"));
                // TODO: if for offline reports
                report = yield this.getAsyncReportFormatMethods()[format.method]({
                    report: _.clone(report),
                    format
                });
                this.formatterBusy = false;
                return report;
            }
            else {
                yield this.wait(1000);
                return this.formatReport(report, format);
            }
        });
    }
    formatDocument(document, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            // iterate throw fields in document
            const fieldsToFormat = yield Promise.all(fields
                .filter(field => {
                return (field.enabled && this.getAsyncFieldFormatMethods()[field.method]);
            })
                // map each field to get value from
                .map(field => {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    let value = null;
                    // check if field method exists
                    value = yield this.getAsyncFieldFormatMethods()[field.method]({
                        document,
                        field
                    });
                    const fieldToSet = {};
                    fieldToSet[field.name] = value;
                    resolve(fieldToSet);
                }));
            }));
            return _.extend(document, ...fieldsToFormat);
        });
    }
    documentMatchFieldQuery(record, fields, field, query) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!query.enabled) {
                return true;
            }
            if (!query.methodInput) {
                query.methodInput = {};
            }
            if (this.getSyncFieldQueryMethods()[query.method]) {
                if (!query.methodInput.value) {
                    query.methodInput.value = "";
                }
                return this.getSyncFieldQueryMethods()[query.method](record[field.name], query.methodInput.value);
            }
            if (this.getAsyncFieldQueryMethods[query.method]) {
                return yield this.getAsyncFieldQueryMethods()[query.method]({
                    document: record,
                    field,
                    query
                });
            }
            else {
                return false;
            }
        });
    }
    /**
     *
     * @param record Document record to check
     * @param fields Fields to check their queries
     */
    documentMatchFieldQueries(record, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield Promise.all(fields.map((field) => __awaiter(this, void 0, void 0, function* () {
                if (!field.enabled) {
                    return true;
                }
                if (!field.queries) {
                    return true;
                }
                return Promise.all(field.queries.map(query => this.documentMatchFieldQuery(record, fields, field, query)));
            })));
            return (_.flatten(results).filter(r => {
                return r === false;
            }).length === 0);
        });
    }
    getAsyncReportFormatMethods() {
        return {
            javascript: (input) => __awaiter(this, void 0, void 0, function* () {
                const formatOptions = input.format.options;
                // tslint:disable-next-line:no-eval
                const methodContainer = eval(formatOptions.code);
                const method = methodContainer({ _ });
                //    try {
                return yield method(input.report);
                // } catch (error) {
                //   return input.report;
                // }
            }),
            groupByQueries: (input) => __awaiter(this, void 0, void 0, function* () {
                const formatOptions = {
                    queries: input.format.options.queries
                };
                return input.report;
            })
        };
    }
    /**
     * will return al async field formatting method available. each method takes document and field as input and return value to set on field
     */
    getAsyncFieldFormatMethods() {
        return {
            joinFields: (input) => __awaiter(this, void 0, void 0, function* () {
                const methodOptions = input.field.methodOptions;
                return _.map(methodOptions.fields, f => input.document[f]).join(methodOptions.separator);
            }),
            javascript: (input) => __awaiter(this, void 0, void 0, function* () {
                const methodOptions = { code: input.field.methodOptions.code };
                let evaluatedCode;
                try {
                    // tslint:disable-next-line:no-eval
                    evaluatedCode = eval(methodOptions.code);
                    if (typeof evaluatedCode !== "function") {
                        return "evaluated code is not a function";
                    }
                }
                catch (error) {
                    return error.message || error;
                }
            })
        };
    }
    getAsyncFieldQueryMethods() {
        return {
            javascript: (opts) => __awaiter(this, void 0, void 0, function* () {
                return true;
            })
        };
    }
    getSyncFieldQueryMethods() {
        return {
            eq: (value, input) => {
                return value === input;
            },
            neq: (value, input) => {
                return value !== input;
            },
            gt: (value, input) => {
                return value < input;
            },
            gte: (value, input) => {
                return value <= input;
            },
            lt: (value, input) => {
                return value > input;
            },
            lte: (value, input) => {
                return value >= input;
            },
            nin: (value, input) => {
                if (!value.indexOf) {
                    return false;
                }
                return value.indexOf(input) === -1;
            },
            inDateRange: (value, input) => {
                value = new Date(value).getTime();
                const from = new Date(input.from).getTime();
                const to = new Date(input.to).getTime();
                if (from && to) {
                    return ((value >= from && value <= to) || (value >= to && value <= from));
                }
                if (from) {
                    return value >= from;
                }
                if (to) {
                    return value <= to;
                }
                return false;
            },
            in: (value, input) => {
                if (!value.indexOf) {
                    return false;
                }
                return value.indexOf(input) !== -1;
            }
        };
    }
}
exports.ReportService = ReportService;

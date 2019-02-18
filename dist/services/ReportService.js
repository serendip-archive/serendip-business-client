"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const bson_objectid_1 = require("bson-objectid");
class ReportService {
    constructor(dataService) {
        this.dataService = dataService;
    }
    async generate(report) {
        if (!report.fields) {
            report.fields = [];
        }
        if (!report.data) {
            await this.dataService.pullCollection(report.entityName);
            let data = await this.dataService.list(report.entityName, 0, 0, true);
            if (!data) {
                data = [];
            }
            data = await Promise.all(data.map((document, index) => {
                return this.formatDocument(document, report.fields);
            }));
            const queriedData = [];
            await Promise.all(data.map((document, index) => {
                return new Promise(async (resolve, reject) => {
                    const isMatch = await this.documentMatchFieldQueries(document, report.fields);
                    if (isMatch) {
                        queriedData.push(document);
                    }
                    resolve();
                });
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
    async formatReport(report, format) {
        if (!this.formatterBusy) {
            this.formatterBusy = true;
            // report = await this.generate(_.omit(report, "data"));
            // TODO: if for offline reports
            report = await this.getAsyncReportFormatMethods()[format.method]({
                report: _.clone(report),
                format
            });
            this.formatterBusy = false;
            return report;
        }
        else {
            await this.wait(1000);
            return this.formatReport(report, format);
        }
    }
    async formatDocument(document, fields) {
        // iterate throw fields in document
        const fieldsToFormat = await Promise.all(fields
            .filter(field => {
            return (field.enabled && this.getAsyncFieldFormatMethods()[field.method]);
        })
            // map each field to get value from
            .map(field => {
            return new Promise(async (resolve, reject) => {
                let value = null;
                // check if field method exists
                value = await this.getAsyncFieldFormatMethods()[field.method]({
                    document,
                    field
                });
                const fieldToSet = {};
                fieldToSet[field.name] = value;
                resolve(fieldToSet);
            });
        }));
        return _.extend(document, ...fieldsToFormat);
    }
    async documentMatchFieldQuery(record, fields, field, query) {
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
            return await this.getAsyncFieldQueryMethods()[query.method]({
                document: record,
                field,
                query
            });
        }
        else {
            return false;
        }
    }
    /**
     *
     * @param record Document record to check
     * @param fields Fields to check their queries
     */
    async documentMatchFieldQueries(record, fields) {
        const results = await Promise.all(fields.map(async (field) => {
            if (!field.enabled) {
                return true;
            }
            if (!field.queries) {
                return true;
            }
            return Promise.all(field.queries.map(query => this.documentMatchFieldQuery(record, fields, field, query)));
        }));
        return (_.flatten(results).filter(r => {
            return r === false;
        }).length === 0);
    }
    getAsyncReportFormatMethods() {
        return {
            javascript: async (input) => {
                const formatOptions = input.format.options;
                // tslint:disable-next-line:no-eval
                const methodContainer = eval(formatOptions.code);
                const method = methodContainer({ _ });
                //    try {
                return await method(input.report);
                // } catch (error) {
                //   return input.report;
                // }
            },
            groupByQueries: async (input) => {
                const formatOptions = {
                    queries: input.format.options.queries
                };
                return input.report;
            }
        };
    }
    /**
     * will return al async field formatting method available. each method takes document and field as input and return value to set on field
     */
    getAsyncFieldFormatMethods() {
        return {
            joinFields: async (input) => {
                const methodOptions = input.field.methodOptions;
                return _.map(methodOptions.fields, f => input.document[f]).join(methodOptions.separator);
            },
            javascript: async (input) => {
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
            }
        };
    }
    getAsyncFieldQueryMethods() {
        return {
            javascript: async (opts) => {
                return true;
            }
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

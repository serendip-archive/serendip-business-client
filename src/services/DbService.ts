import * as _ from "underscore";

import {
  DbProviderInterface,
  DbProviderOptionsInterface
} from "serendip-business-model";
import { ClientServiceInterface } from "../Client";

export interface DbServiceOptions {
  /**
   * name of default provider. will be used in case of executing collection without provider argument set
   */
  defaultProvider?: string;

  providers?: {
    [key: string]: {
      object?: DbProviderInterface;
      options?: DbProviderOptionsInterface;
    };
  };
}

/**
 * Every functionality thats use database should use it trough this service
 */
export class DbService implements ClientServiceInterface {
  static dependencies = [];

  static options: DbServiceOptions;

  // static options: DbServiceOptions = {
  //   defaultProvider: "Nedb",
  //   providers: {
  //     Nedb: {
  //       object: new NedbProvider(),
  //       options: {
  //         folderPath: ".db"
  //       }
  //     }
  //   }
  // };

  static configure(options: DbServiceOptions) {
    DbService.options = options;
  }

  private providers: { [key: string]: DbProviderInterface } = {};
  async start() {
    if (!DbService.options)
      throw "\n\tconfigure DbService options and providers.\n";
    for (const key of Object.keys(DbService.options.providers)) {
      const provider = DbService.options.providers[key];
      console.log(`DbService > trying to connect to DbProvider named: ${key}`);
      await provider.object.initiate(provider.options);
      this.providers[key] = provider.object;

      console.log(`DbService > connected to DbProvider name: ${key}`);
    }
  }

  collection<T>(collectionName: string, track?: boolean, provider?: string) {
    if (!provider && !DbService.options.defaultProvider) {
      throw "collection specific provider and default provider not set";
    }
    if (!this.providers[provider || DbService.options.defaultProvider])
      throw `> DbService provider named ${provider ||
        DbService.options.defaultProvider} not configured`;
    return this.providers[
      provider || DbService.options.defaultProvider
    ].collection<T>(collectionName, track);
  }
  constructor() {}
}

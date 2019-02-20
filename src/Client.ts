import * as sUtil from "serendip-utility";

export interface ClientServiceInterface {
  start?(): Promise<any>;

  // optional array of service names your Client dependent on and imported in serendip start
  dependencies?: string[];

  // private variable to hold options value
  options?: any;

  // method to set configuration
  configure?(options: any): void;
}

export interface ClientOptionsInterface {
  // Client services to start.
  services?: ClientServiceInterface[] | any[];

  // Number CPU cores for cpu clustering. set to 'max' for running on all cpu cores
  cpuCores?: number | string;

  logging?: "info" | "warn" | "error" | "silent";

  // Set to true for disabling http(s) Client. this is useful when you are building client apps without a http(s) Client
  clientMode?: boolean;
}

/**
 *  Will contain everything that we need from client
 */

export class Client {
  public static services: any = {};

  public static opts: ClientOptionsInterface;

  // passing worker from Start.js
  constructor(opts: ClientOptionsInterface, callback?: Function) {
    Client.opts = opts;

    if (!opts.services) opts.services = [];

    this.addServices(opts.services)
      .then(() => callback())
      .catch(e => callback(e));
  }

  // FIXME: needs refactor
  private async addServices(serviceClasses: any[]) {
    if (!serviceClasses) return;

    if (serviceClasses.length == 0) return;

    let serviceObjects: { [key: string]: ClientServiceInterface } = {};
    let unsortedDependencies = [];
    serviceClasses.forEach(sv => {
      if (!sv) return;

      if (typeof sv.dependencies !== "undefined" && sv.dependencies.length)
        sv.dependencies.forEach((dep: any) => {
          dep = sUtil.text.capitalizeFirstLetter(dep);
          if (unsortedDependencies.indexOf([sv.name, dep]) === -1)
            unsortedDependencies.push([sv.name, dep]);
        });

      sUtil.functions.args(sv).forEach((dep: any) => {
        dep = sUtil.text.capitalizeFirstLetter(dep);
        if (unsortedDependencies.indexOf([sv.name, dep]) === -1)
          unsortedDependencies.push([sv.name, dep]);
      });

      serviceObjects[sv.name] = sv;
    });

    // TODO: replace toposort module with code :)
    var sortedDependencies: string[] = (sUtil.arrays.toposort(
      unsortedDependencies
    ) as any).reverse();

    // if there is only one service topoSort will return empty array so we should push that one service ourselves
    if (sortedDependencies.length == 0) {
      if (serviceClasses[0]) sortedDependencies.push(serviceClasses[0].name);
    }

    if (Client.opts.logging == "info")
      console.log(`Starting Client services...`);

    if (serviceClasses.length > 0)
      await this.startService(
        0,
        serviceObjects,
        sortedDependencies,
        unsortedDependencies
      );
  }

  /**
   * Will start services from Index to length of sortedDependencies
   * @param index Index of item in sortedDependencies to start
   * @param serviceObjects key value object that contains service objects and their names
   * @param sortedDependencies Service names sorted by dependency order
   */
  async startService(
    index: number,
    serviceObjects: { [key: string]: ClientServiceInterface },
    sortedDependencies: string[],
    unsortedDependencies: string[][]
  ) {
    const serviceName = sortedDependencies[index];

    let serviceDependencies =
      unsortedDependencies.filter(p => p[0] === serviceName).map(p => p[1]) ||
      [];

    if (serviceDependencies.length > 0) {
      serviceDependencies = serviceDependencies.reduceRight(
        (prev: any, current, currentIndex, array) => {
          if (typeof prev == "string") return [prev];

          if (prev.indexOf(current) == -1) return prev.concat([current]);

          return prev;
        }
      ) as any;
    }

    if (typeof serviceDependencies == "string")
      serviceDependencies = [serviceDependencies];

    if (!serviceName) return;

    var serviceObject: ClientServiceInterface;

    if (!serviceObjects[serviceName])
      throw `${serviceName} not imported as service in start method. it's a dependency of ` +
        unsortedDependencies
          .filter(p => p[1] == serviceName)
          .map(p => p[0])
          .join(",");

    try {
      serviceObject = new (serviceObjects as any)[serviceName](
        ...unsortedDependencies
          .filter(p => p[0] === serviceName)
          .map(p => Client.services[p[1]])
      );
    } catch (e) {
      throw `Client Service Error in "${serviceName}"\n\t` + e.message;
    }

    Client.services[serviceName] = serviceObject;

    if (!serviceObject.start)
      return this.startService(
        index + 1,
        serviceObjects,
        sortedDependencies,
        unsortedDependencies
      );
    else {
      if (Client.opts.logging == "info")
        console.log(
          `${(index + 1).toString().padStart(2, " ")} of ${Object.keys(
            serviceObjects
          )
            .length.toString()
            .padStart(
              2,
              ""
            )} starting ${serviceName} it depends on: ${serviceDependencies.join(
            ","
          ) || "none"}`
        );

      await serviceObject.start();

      if (Client.opts.logging == "info")
        console.log(
          `${(index + 1).toString().padStart(2, " ")} of ${Object.keys(
            serviceObjects
          )
            .length.toString()
            .padStart(2, " ")} ☑ ${serviceName}`
        );

      if (sortedDependencies.length > index + 1)
        return this.startService(
          index + 1,
          serviceObjects,
          sortedDependencies,
          unsortedDependencies
        );

      return;
    }
  }
}

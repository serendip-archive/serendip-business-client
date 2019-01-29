import { ServerServiceInterface, Server } from "serendip";
import { EventEmitter } from "events";
import { HttpClientService } from "./HttpClientService";
import * as _ from "underscore";
export interface AuthServiceOptionsInterface {}

export class AuthService implements ServerServiceInterface {
  httpClientService: HttpClientService;
  static configure(options: AuthServiceOptionsInterface): void {
    AuthService.options = _.extend(AuthService.options, options);
  }

  static options: AuthServiceOptionsInterface = {};

  static dependencies = ["HttpClientService"];

  static events = new EventEmitter();

  constructor() {
    this.httpClientService = Server.services["HttpClientService"];
  }

  // Login using clientId, clientSecret provided from https://serendip.cloud
  async login(clientId: string, clientSecret: string) {
    var token = await this.httpClientService.request({
      url: "/api/auth/token",
      method: "POST",
      json: {
        clientId,
        clientSecret
      }
    });
  }

  async start() {}
}

import { BusinessModel } from "serendip-business-model";
import { LocalStorageService } from "./LocalStorageService";
import { ClientServiceInterface } from "../Client";

export class BusinessService implements ClientServiceInterface {
  businesses: any;

  async start() {}
  private _business: BusinessModel;

  get business(): BusinessModel {
    if (this._business) {
      return this._business;
    } else if (this.localStorageService.getItem("business")) {
      return JSON.parse(this.localStorageService.getItem("business"));
    }
    return undefined;
  }

  set business(val) {
    this._business = val;
    this.localStorageService.setItem("business", JSON.stringify(val));
  }
  constructor(private localStorageService: LocalStorageService) {}
}

import { BusinessModel } from "serendip-business-model";
import { ServerServiceInterface } from "serendip/src";
import { LocalStorageService } from "./LocalStorageService";

export class BusinessService implements ServerServiceInterface {
  async start() {}
  private _business: BusinessModel;

  get business(): BusinessModel {
    if (this._business) {
      return this._business;
    } else if (this.localStorageService.getItem("business")) {
      return JSON.parse(this.localStorageService.getItem("business"));
    }
  }

  set business(val) {
    this._business = val;
    this.localStorageService.setItem("business", JSON.stringify(val));
  }
  constructor(private localStorageService: LocalStorageService) {}
}

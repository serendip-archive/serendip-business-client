import { ClientServiceInterface } from "../Client";

export interface LocalStorageServiceOptions {
  save?(storage: { [key: string]: any }): Promise<void>;
  load?(): Promise<{ [key: string]: any }>;

  clear?(): Promise<void>;
  set?(key, value): Promise<void>;

  get?(key): Promise<any>;

  remove?(key): Promise<void>;
}
export class LocalStorageService implements ClientServiceInterface {
  constructor() {}
  static options: LocalStorageServiceOptions = {};
  static configure(opts: LocalStorageServiceOptions) {
    LocalStorageService.options = opts;
  }
  async start() {
    if (LocalStorageService.options.load)
      this.storage = await LocalStorageService.options.load();
  }

  private storage: { [key: string]: any } = {};

  setItem(key, value) {
    this.storage[key] = value;
    if (LocalStorageService.options.set)
      LocalStorageService.options.set(key, value);
  }

  getItem(key) {
    return this.storage[key];
  }

  removeItem(key) {
    delete this.storage[key];
    if (LocalStorageService.options.remove)
      LocalStorageService.options.remove(key);
  }
  clear() {
    this.storage = {};
    if (LocalStorageService.options.clear) LocalStorageService.options.clear();
  }
}

import { ServerServiceInterface, Server } from "serendip";
import * as Request from "request";
export class HttpClientService implements ServerServiceInterface {
  async start() {}

  request<T>(
    opts: Request.CoreOptions & Request.UrlOptions,
    returns?: "body" | "response"
  ): Promise<T | any> {
    return new Promise((resolve, reject) => {
      Request(opts, (err, res, body) => {
        if (err) return reject(err);

        if (returns == "response") return resolve(res);

        return resolve(body);
      });
    });
  }
}

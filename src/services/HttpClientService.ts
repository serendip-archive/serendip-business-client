import { ServerServiceInterface, Server } from "serendip";
import * as Request from "request";
export class HttpClientService implements ServerServiceInterface {
  static dependencies = [];

  async start() {}

  request(
    opts: Request.CoreOptions & Request.UrlOptions
  ): Promise<Request.Response> {
    return new Promise((resolve, reject) => {
      Request(opts, (err, res, body) => {
        if (err) return reject(err);
        else resolve(res);
      });
    });
  }
}

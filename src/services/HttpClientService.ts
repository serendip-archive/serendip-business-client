import * as Request from "request";
import { ClientServiceInterface } from "../Client";
export class HttpClientService implements ClientServiceInterface {
  async start() {}

  request<T>(
    opts: Request.CoreOptions & Request.UrlOptions,
    returns?: "body" | "response"
  ): Promise<T | any> {
    return new Promise((resolve, reject) => {
      Request(opts, (err, res, body) => {

    
        if (err) return reject(err);

        if(res.statusCode != 200)
        return reject(body);

        if (returns == "response") return resolve(res);

        return resolve(body);
      });
    });
  }
}

import * as _ from "underscore";
import * as request from 'request'

export function getToken(opts: {
  username: string;
  mobile?: string;
  password?: string;
  oneTimePassword?: string;
}): Promise<userToken> {
  try {
    console.log(this.apiUrl);
    const newToken = await this.http
      .post<userToken>(
        this.apiUrl + "/api/auth/token",
        _.extend(opts, {
          grant_type: "password"
        })
      )
      .toPromise();

    if (!newToken) {
      throw new Error("empty token");
    }

    // console.log("newToken", newToken);

    this.loggedIn = true;

    return newToken;
  } catch (error) {
    console.error("Error in getting new token:", error);
    return;
  }
}

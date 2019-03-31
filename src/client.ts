import fetch from 'node-fetch'
import * as auth from './auth'

export enum ApiVersion {
  One = 'v1'
}

// A Flopay API v1 client.
// It is initialized without a valid authentication,
// which means that `authorize` should be the first
// call made before using it to interact with the API.
export class Client {
  static readonly baseURL: string = 'https://api.flopay.io'
  static readonly version: ApiVersion = ApiVersion.One
  readonly cred: auth.Cred
  private auth: auth.Auth

  constructor(id: string, secret: string) {
    this.cred = { id, secret } as auth.Cred
  }

  /**
   * Makes a new client using the FLOPAY_CLIENT_{ID, SECRET}
   * environment variables as the client credentials. If
   * the variables are not found, an exception is thrown.
   *
   * @method fromEnv
   * @return {Client}
   */
  static fromEnv() {
    const id = process.env.FLOPAY_CLIENT_ID
    const secret = process.env.FLOPAY_CLIENT_SECRET
    if (id === undefined || secret === undefined) {
      throw new InvalidCredError()
    }

    return new Client(id, secret)
  }

  /**
   * Acquires a valid access token for this client.
   * The granted token is valid for 3600s from now.
   * It's safe to be re-called when the token has
   * expired an a new one is needed. It could also
   * be called to acquire a new token even before the
   * current one has expired.
   *
   * @method authorize
   */
  async authorize() {
    const req: RequestInit = {
      method: 'POST',
      body: new auth.Request(this.cred).toJSONString()
    }
    const res = await fetch(this.endpoint(auth.path), req)
    const json: auth.Response = await res.json()
    this.auth = new auth.Auth(json)
  }

  /**
   * @method endpoint
   * @param {String} path Path to append to base URL
   * @return {String}
   */
  endpoint(path: string): string {
    return `${Client.baseURL}/${Client.version}/${path}`
  }

  /**
   * Returns true if the client is authorized, and the
   * acquired authorization can be used to make requests.
   * Returns false otherwise.
   *
   * @method isAuthorized
   * @return {Boolean} True if client is authorized, false otherwise
   */
  isAuthorized(): boolean {
    return false
  }
}

export class InvalidCredError extends Error {
  constructor() {
    super(
      `FLOPAY_CLIENT_{ID, SECRET} env vars expected but not found. Please set them and try again. Or use the other constructor that accepts the client id and client secret as arguments.`
    )
  }
}
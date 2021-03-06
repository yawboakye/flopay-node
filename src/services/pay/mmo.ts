import snake from 'lodash.snakecase'
import { Req } from '../../client'

export class Request implements Req {
  private _input: Input
  private _output: Output
  private _raw: { [k: string]: any } // the raw response received

  constructor (input: Input) {
    this._input = input
  }

  /**
   * @property output
   */
  get output (): Output {
    return this._output
  }

  /**
   * The relative URL endpoint to use when
   * performing the request.
   *
   * @property to
   */
  get to (): string {
    return 'transfer.json'
  }

  /**
   * The HTTP method to use when performing the request.
   *
   * @property method
   */
  get method (): string {
    return 'POST'
  }

  /**
   * Returns JSON object of the request's input, ready
   * to be sent as the body of an HTTP request.
   *
   * @property body
   */
  get body (): Object {
    return Object.entries(this._input).reduce(
      (b, [k, v]) => {
        if (k === 'callbackURLs') {
          // `lodash.snakecase` can't handle this key
          // properly.
          b['callback_urls'] = v
        } else {
          b[snake(k)] = v
        }
        return b
      },
      {} as { [s: string]: any }
    )
  }

  /**
   * @property response
   */
  get response (): { [k: string]: any } {
    return this._raw
  }

  /**
   * Sets the output of the request.
   * The response received after performing the request is
   * converted to the expected output type. It also sets the
   * raw response that was received.
   *
   * @param {object} data Response
   */
  set response (data: { [k: string]: any }) {
    this._raw = data
    this.handleError(data)

    const { reference, provider, recipient, amount, currency, message } = data.response
    this._output = {
      success: true,
      response: {
        reference,
        provider,
        recipient,
        amount,
        currency,
        message
      }
    }
  }

  handleError (data: { [k: string]: any }) {
    if (data.success === false) {
      const type = data.response.message_type || data.response.error_type
      const message = data.response.message || data.response.error_message

      switch (type) {
        case 'invalid_customer_num': throw new InvalidCustomerNumber(message)
        case 'exceeded_daily_limit': throw new ExceededDailyLimit(message)
        default: throw new Error(`unknown error type: ${type}, with message ${message}`)
      }
    }
  }
}

// Input represents the set of required and optional
// parameters to send when making a payment to a Mobile
// Money Account (from another Mobile Money account).
// While `provider` is optional, it's recommended that you
// set it since the heuristic used to automatically detect
// fails if the recipient's number is ported. That is, it
// could be a VODAFONE user even though their number starts
// with 024, which belongs to MTN.
export interface Input {
  // required
  senderAmount: number // Amount to send, for e.g. 12.34
  senderCurrency: string // Currency of the amount to send, for e.g. GHS
  recipientAmount: number // Amount received
  recipientCurrency: string // Currency of amount received
  recipientNo: string // Mobile Money Account number of recipient
  countryCode: string // Country code of sender, for e.g. GHS
  serviceCode: string // The kind of payment modes/services provided in the country, e.g. cashin

  // optional
  reference?: string // Alphanumeric, uniquely identifies transaction to client
  callbackURLs?: string[] // Allows to customize callbacks per request. Defaults to global if none given
  recipientName?: string // Name of the recipient or description of the transaction
  provider?: string // Mobile Money Operator of the recipient. Due to porting it's a good idea to specify
  live?: boolean // Production?
}

// Output is the output recieved after a successful
// or failed call to the Flopay API.
export interface Output {
  success: boolean
  response: Response
}

// Response maps onto the structure of the expected
// JSON response for successful MMO operation.
// See https://developer.flopay.io/pay-out/mobile-wallet
// for more information.
export interface Response {
  reference: string
  provider: string
  recipient: string
  amount: number
  currency: string
  message: string
}

// InvalidCustomerNumber is the exception thrown
// when the customer's number (aka Mobile Money
// account number) is invalid.
export class InvalidCustomerNumber extends Error {
  constructor (message: string) {
    super(message)
  }
}

// ExceededDailyLimit is the exception thrown
// when the customer has exceeded their daily
// wallet limit.
export class ExceededDailyLimit extends Error {
  constructor (message: string) {
    super(message)
  }
}
